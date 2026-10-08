package com.zmartcredential.service;

import com.zmartcredential.dto.organization.LocationResponse;
import com.zmartcredential.dto.organization.OrgStructureDtos.ClientNode;
import com.zmartcredential.dto.organization.OrgStructureDtos.ClientRequest;
import com.zmartcredential.dto.organization.OrgStructureDtos.ClientResponse;
import com.zmartcredential.dto.organization.OrgStructureDtos.DeleteResult;
import com.zmartcredential.dto.organization.OrgStructureDtos.InviteCodeResponse;
import com.zmartcredential.dto.organization.OrgStructureDtos.OrgTreeResponse;
import com.zmartcredential.dto.organization.OrgStructureDtos.PracticeNode;
import com.zmartcredential.dto.organization.OrgStructureDtos.PracticeRequest;
import com.zmartcredential.dto.organization.OrgStructureDtos.PracticeResponse;
import com.zmartcredential.dto.organization.OrgStructureDtos.Totals;
import com.zmartcredential.dto.organization.OrganizationResponse;
import com.zmartcredential.dto.organization.OrganizationUpdateRequest;
import com.zmartcredential.entity.Client;
import com.zmartcredential.entity.Location;
import com.zmartcredential.entity.Organization;
import com.zmartcredential.entity.Practice;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.ConflictException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.ClientRepository;
import com.zmartcredential.repository.LocationRepository;
import com.zmartcredential.repository.OrganizationRepository;
import com.zmartcredential.repository.PracticeRepository;
import com.zmartcredential.repository.ProviderRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.PermissionService;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import static com.zmartcredential.service.OrgLocationService.blankToNull;
import static com.zmartcredential.service.OrgLocationService.countMap;

/** Organization view: tenant org, clients, practices and the full org tree. Permission entity: location. */
@Service
@RequiredArgsConstructor
public class OrgStructureService {

    private final OrganizationRepository organizationRepository;
    private final ClientRepository clientRepository;
    private final PracticeRepository practiceRepository;
    private final LocationRepository locationRepository;
    private final ProviderRepository providerRepository;
    private final OrgLocationService locationService;
    private final CryptoService cryptoService;
    private final AuthContext authContext;
    private final PermissionService permissionService;

    // ---------- tree ----------

    @Transactional(readOnly = true)
    public OrgTreeResponse tree(String q) {
        authContext.requireStaff();
        permissionService.require("location", "read");
        Long orgId = authContext.orgId();
        Organization org = loadOrg(orgId);
        String needle = q == null || q.isBlank() ? null : q.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);

        List<Client> clients = clientRepository.findByOrgIdOrderByNameAsc(orgId);
        List<Practice> practices = practiceRepository.findByOrgIdOrderByNameAsc(orgId);
        List<LocationResponse> locations = locationService.toResponses(orgId,
                locationRepository.findByOrgIdOrderByNameAsc(orgId));
        Map<Long, Long> practiceCounts = countMap(providerRepository.orgCountByPractice(orgId));
        Map<Long, Long> clientCounts = countMap(providerRepository.orgCountByClient(orgId));

        Map<Long, List<LocationResponse>> locByPractice = locations.stream().filter(l -> l.practiceId() != null)
                .collect(Collectors.groupingBy(LocationResponse::practiceId));
        Map<Long, List<Practice>> pracByClient = practices.stream()
                .collect(Collectors.groupingBy(Practice::getClientId));

        List<ClientNode> clientNodes = new ArrayList<>();
        for (Client c : clients) {
            boolean clientMatch = needle == null || has(c.getName(), needle);
            List<PracticeNode> pNodes = new ArrayList<>();
            List<Practice> clientPractices = pracByClient.getOrDefault(c.getId(), List.of());
            for (Practice p : clientPractices) {
                List<LocationResponse> pLocs = locByPractice.getOrDefault(p.getId(), List.of());
                boolean practiceMatch = clientMatch || has(p.getName(), needle) || has(p.getTaxId(), needle);
                List<LocationResponse> shown = practiceMatch ? pLocs
                        : pLocs.stream().filter(l -> locMatch(l, needle)).toList();
                if (!practiceMatch && shown.isEmpty()) continue;
                pNodes.add(new PracticeNode(p.getId(), p.getClientId(), p.getName(), p.getTaxId(), p.getAddress(),
                        p.getPhone(), p.getEmail(), pLocs.size(), practiceCounts.getOrDefault(p.getId(), 0L), shown));
            }
            if (!clientMatch && pNodes.isEmpty()) continue;
            clientNodes.add(new ClientNode(c.getId(), c.getName(), clientPractices.size(),
                    clientCounts.getOrDefault(c.getId(), 0L), pNodes));
        }
        List<LocationResponse> unassigned = locations.stream()
                .filter(l -> l.practiceId() == null && (needle == null || locMatch(l, needle))).toList();

        long totalProviders = providerRepository.countByOrgId(orgId);
        long assigned = providerRepository.findByOrgId(orgId).stream()
                .filter(p -> p.getLocationId() != null || p.getPracticeId() != null || p.getClientId() != null).count();
        Totals totals = new Totals(clients.size(), practices.size(), locations.size(), totalProviders,
                totalProviders - assigned);
        return new OrgTreeResponse(OrganizationResponse.of(org), clientNodes, unassigned, totals);
    }

    // ---------- organization ----------

    @Transactional(readOnly = true)
    public OrganizationResponse getOrganization() {
        authContext.requireStaff();
        return OrganizationResponse.of(loadOrg(authContext.orgId()));
    }

    @Transactional
    public OrganizationResponse updateOrganization(OrganizationUpdateRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN);
        Organization o = loadOrg(authContext.orgId());
        o.setName(req.name().trim());
        if (req.orgType() != null) o.setOrgType(blankToNull(req.orgType()));
        o.setTaxId(blankToNull(req.taxId()));
        o.setWebsite(blankToNull(req.website()));
        o.setAddress(blankToNull(req.address()));
        o.setCity(blankToNull(req.city()));
        o.setState(blankToNull(req.state()));
        o.setZip(blankToNull(req.zip()));
        o.setPhone(blankToNull(req.phone()));
        o.setEmail(req.email() == null || req.email().isBlank() ? null : req.email().trim().toLowerCase(Locale.ROOT));
        return OrganizationResponse.of(organizationRepository.save(o));
    }

    @Transactional
    public InviteCodeResponse inviteCode() {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN);
        Organization o = loadOrg(authContext.orgId());
        if (o.getInviteCode() == null) {
            o.setInviteCode(newInviteCode());
            organizationRepository.save(o);
        }
        return new InviteCodeResponse(o.getInviteCode());
    }

    @Transactional
    public InviteCodeResponse regenerateInviteCode() {
        authContext.requireRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN);
        Organization o = loadOrg(authContext.orgId());
        o.setInviteCode(newInviteCode());
        organizationRepository.save(o);
        return new InviteCodeResponse(o.getInviteCode());
    }

    public String newInviteCode() {
        String code;
        do {
            code = "ZMARTC-" + cryptoService.randomToken(3).toUpperCase(Locale.ROOT);
        } while (organizationRepository.existsByInviteCode(code));
        return code;
    }

    // ---------- clients ----------

    @Transactional(readOnly = true)
    public List<ClientResponse> listClients() {
        authContext.requireStaff();
        permissionService.require("location", "list");
        Long orgId = authContext.orgId();
        Map<Long, Long> counts = countMap(providerRepository.orgCountByClient(orgId));
        Map<Long, Long> practiceCounts = practiceRepository.findByOrgId(orgId).stream()
                .collect(Collectors.groupingBy(Practice::getClientId, Collectors.counting()));
        return clientRepository.findByOrgIdOrderByNameAsc(orgId).stream()
                .map(c -> new ClientResponse(c.getId(), c.getName(), practiceCounts.getOrDefault(c.getId(), 0L).intValue(),
                        counts.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional
    public ClientResponse createClient(ClientRequest req) {
        requireWrite("create");
        String name = req.name().trim().replaceAll("\\s+", " ");
        requireUniqueClientName(authContext.orgId(), name, null);
        Client c = new Client();
        c.setOrgId(authContext.orgId());
        c.setName(name);
        c = clientRepository.save(c);
        return new ClientResponse(c.getId(), c.getName(), 0, 0);
    }

    @Transactional
    public ClientResponse updateClient(Long id, ClientRequest req) {
        requireWrite("update");
        Long orgId = authContext.orgId();
        Client c = loadClient(orgId, id);
        String name = req.name().trim().replaceAll("\\s+", " ");
        requireUniqueClientName(orgId, name, id);
        c.setName(name);
        clientRepository.save(c);
        long providers = countMap(providerRepository.orgCountByClient(orgId)).getOrDefault(id, 0L);
        return new ClientResponse(c.getId(), c.getName(), practiceRepository.findByClientId(id).size(), providers);
    }

    /** Client names are unique within an organization (case and extra spaces ignored). */
    private void requireUniqueClientName(Long orgId, String name, Long exceptId) {
        String key = name.toLowerCase(Locale.ROOT);
        boolean taken = clientRepository.findByOrgId(orgId).stream()
                .anyMatch(c -> !c.getId().equals(exceptId) && c.getName() != null
                        && c.getName().trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT).equals(key));
        if (taken) throw new ConflictException("A client named \"" + name + "\" already exists");
    }

    /** Deletes the client and (by FK cascade) its practices; their locations stay, detached from any practice. */
    @Transactional
    public DeleteResult deleteClient(Long id) {
        requireWrite("delete");
        Long orgId = authContext.orgId();
        Client c = loadClient(orgId, id);
        int detached = 0;
        for (Practice p : practiceRepository.findByClientId(c.getId())) {
            detached += detachLocations(p.getId());
        }
        int unassigned = providerRepository.orgUnassignClient(orgId, c.getId());
        clientRepository.deleteById(c.getId());
        return new DeleteResult(true, unassigned, detached);
    }

    // ---------- practices ----------

    @Transactional(readOnly = true)
    public List<PracticeResponse> listPractices(Long clientId) {
        authContext.requireStaff();
        permissionService.require("location", "list");
        Long orgId = authContext.orgId();
        return practiceRepository.findByOrgIdOrderByNameAsc(orgId).stream()
                .filter(p -> clientId == null || clientId.equals(p.getClientId()))
                .map(p -> toPractice(orgId, p)).toList();
    }

    @Transactional
    public PracticeResponse createPractice(Long clientId, PracticeRequest req) {
        requireWrite("create");
        Long orgId = authContext.orgId();
        Client c = loadClient(orgId, clientId);
        Practice p = new Practice();
        p.setOrgId(orgId);
        p.setClientId(c.getId());
        applyPractice(p, req);
        return toPractice(orgId, practiceRepository.save(p));
    }

    @Transactional
    public PracticeResponse updatePractice(Long id, PracticeRequest req) {
        requireWrite("update");
        Long orgId = authContext.orgId();
        Practice p = loadPractice(orgId, id);
        if (req.clientId() != null && !req.clientId().equals(p.getClientId())) {
            Client target = clientRepository.findByIdAndOrgId(req.clientId(), orgId)
                    .orElseThrow(() -> new BadRequestException("Selected client does not exist"));
            p.setClientId(target.getId());
            providerRepository.orgMovePracticeProviders(orgId, p.getId(), target.getId());
        }
        applyPractice(p, req);
        return toPractice(orgId, practiceRepository.save(p));
    }

    @Transactional
    public DeleteResult deletePractice(Long id) {
        requireWrite("delete");
        Long orgId = authContext.orgId();
        Practice p = loadPractice(orgId, id);
        int detached = detachLocations(p.getId());
        int unassigned = providerRepository.orgUnassignPractice(orgId, p.getId());
        practiceRepository.deleteById(p.getId());
        return new DeleteResult(true, unassigned, detached);
    }

    // ---------- helpers ----------

    private int detachLocations(Long practiceId) {
        List<Location> locs = locationRepository.findByPracticeId(practiceId);
        for (Location l : locs) l.setPracticeId(null);
        locationRepository.saveAll(locs);
        return locs.size();
    }

    private void applyPractice(Practice p, PracticeRequest req) {
        p.setName(req.name().trim());
        p.setTaxId(blankToNull(req.taxId()));
        p.setAddress(blankToNull(req.address()));
        p.setPhone(blankToNull(req.phone()));
        p.setEmail(req.email() == null || req.email().isBlank() ? null : req.email().trim().toLowerCase(Locale.ROOT));
    }

    private PracticeResponse toPractice(Long orgId, Practice p) {
        Map<Long, String> clientNames = clientRepository.findByOrgId(orgId).stream()
                .collect(Collectors.toMap(Client::getId, Client::getName, (a, b) -> a));
        long providers = providerRepository.countByOrgIdAndPracticeId(orgId, p.getId());
        int locs = p.getId() == null ? 0 : locationRepository.findByPracticeId(p.getId()).size();
        return new PracticeResponse(p.getId(), p.getClientId(), clientNames.get(p.getClientId()), p.getName(),
                p.getTaxId(), p.getAddress(), p.getPhone(), p.getEmail(), locs, providers);
    }

    private void requireWrite(String action) {
        authContext.requireStaff();
        permissionService.require("location", action);
    }

    private Organization loadOrg(Long orgId) {
        return organizationRepository.findById(orgId).orElseThrow(() -> NotFoundException.of("Organization", orgId));
    }

    private Client loadClient(Long orgId, Long id) {
        return clientRepository.findByIdAndOrgId(id, orgId).orElseThrow(() -> NotFoundException.of("Client", id));
    }

    private Practice loadPractice(Long orgId, Long id) {
        return practiceRepository.findByIdAndOrgId(id, orgId).orElseThrow(() -> NotFoundException.of("Practice", id));
    }

    private static boolean locMatch(LocationResponse l, String needle) {
        return has(l.name(), needle) || has(l.legalName(), needle) || has(l.city(), needle)
                || has(l.address(), needle) || has(l.npi(), needle);
    }

    private static boolean has(String v, String needle) {
        return needle == null || (v != null && v.toLowerCase(Locale.ROOT).contains(needle));
    }
}
