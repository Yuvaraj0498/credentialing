package com.zmartcredential.service;

import com.zmartcredential.dto.report.BrReportDtos.*;
import com.zmartcredential.common.PageResponse;
import com.zmartcredential.entity.*;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.repository.*;
import com.zmartcredential.security.AuthContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BrReportService {

    /** Roster column ids (prototype ALL_COLUMNS). */
    public static final List<String> ROSTER_COLUMNS = List.of("name", "specialty", "status", "docs", "email", "npi",
            "caqh", "location", "practice", "license", "deaExpires", "dateAdded");
    private static final int REAPPOINTMENT_CYCLE_DAYS = 730;

    private final AuthContext authContext;
    private final ProviderRepository providerRepository;
    private final ProviderDocumentRepository providerDocumentRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PayerRepository payerRepository;
    private final LocationRepository locationRepository;
    private final PracticeRepository practiceRepository;

    private record OrgData(List<Provider> providers, Map<Long, List<ProviderDocument>> docs, List<DocumentType> docTypes) {
        List<ProviderDocument> docsOf(Provider p) {
            return docs.getOrDefault(p.getId(), List.of());
        }
    }

    private OrgData load(String q) {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        List<Provider> providers = providerRepository.findByOrgIdOrderByLastNameAsc(orgId);
        if (q != null && !q.isBlank()) {
            var words = com.zmartcredential.util.SearchText.words(q);
            providers = providers.stream().filter(p -> com.zmartcredential.util.SearchText.matches(words, BrSupport.providerName(p), p.getFirstName(),
                    p.getLastName(), p.getNpi(), p.getSpecialty(), p.getEmail(), p.getCaqhId())).toList();
        }
        Set<Long> ids = providers.stream().map(Provider::getId).collect(Collectors.toSet());
        Map<Long, List<ProviderDocument>> docs = ids.isEmpty() ? Map.of()
                : providerDocumentRepository.findByProviderIdIn(ids).stream()
                .collect(Collectors.groupingBy(ProviderDocument::getProviderId));
        return new OrgData(providers, docs, documentTypeRepository.findAllByOrderBySortOrderAsc());
    }

    private static long countStatus(List<ProviderDocument> docs, String status) {
        return docs.stream().filter(d -> status.equals(d.getStatus())).count();
    }

    private static long applicable(List<ProviderDocument> docs) {
        return docs.stream().filter(d -> !"na".equals(d.getStatus())).count();
    }

    private static int pct(long a, long b) {
        return b == 0 ? 0 : (int) Math.round(a * 100.0 / b);
    }

    // ---------------------------------------------------------------- provider credentialing

    public ProviderCredentialing providerCredentialing() {
        OrgData data = load(null);
        LocalDate today = BrSupport.today();
        Map<String, Long> byStatus = new TreeMap<>();
        long missing = 0, expired = 0, lt30 = 0, d60 = 0, d90 = 0;
        List<ProviderProgressRow> rows = new ArrayList<>();
        for (Provider p : data.providers()) {
            byStatus.merge(p.getStatus(), 1L, Long::sum);
            List<ProviderDocument> docs = data.docsOf(p);
            for (ProviderDocument d : docs) {
                if ("na".equals(d.getStatus())) continue;
                if ("missing".equals(d.getStatus())) missing++;
                if (d.getExpiresAt() != null) {
                    long days = ChronoUnit.DAYS.between(today, d.getExpiresAt());
                    if (days < 0) expired++;
                    else if (days <= 30) lt30++;
                    else if (days <= 60) d60++;
                    else if (days <= 90) d90++;
                }
            }
            long approved = countStatus(docs, "approved"), total = applicable(docs);
            rows.add(new ProviderProgressRow(p.getId(), BrSupport.providerName(p), p.getSpecialty(), p.getStatus(),
                    BrSupport.statusKey(p.getStatus()), approved, total, countStatus(docs, "missing"),
                    countStatus(docs, "expired"), countStatus(docs, "pending_review"), pct(approved, total)));
        }

        List<Enrollment> enrollments = enrollmentRepository.findByOrgId(authContext.orgId());
        List<Enrollment> completed = enrollments.stream()
                .filter(e -> "approved".equals(e.getStatus()) && BrSupport.tatDays(e) != null).toList();
        Integer avgTat = BrSupport.avg(completed.stream().map(BrSupport::tatDays).toList());
        long inProgress = enrollments.stream().filter(e -> BrSupport.ACTIVE_ENROLLMENT.contains(e.getStatus())).count();

        List<TatPoint> trend = new ArrayList<>();
        YearMonth now = YearMonth.from(today);
        for (int i = 11; i >= 0; i--) {
            YearMonth ym = now.minusMonths(i);
            List<Integer> vals = completed.stream()
                    .filter(e -> e.getEffectiveDate() != null && YearMonth.from(e.getEffectiveDate()).equals(ym))
                    .map(BrSupport::tatDays).toList();
            trend.add(new TatPoint(ym.toString(), monthLabel(ym), BrSupport.avg(vals), vals.size()));
        }

        return new ProviderCredentialing(data.providers().size(), byStatus, missing,
                new ExpirationBuckets(expired, lt30, d60, d90), avgTat, completed.size(), inProgress, trend,
                collection(data), rows);
    }

    private static String monthLabel(YearMonth ym) {
        return ym.getMonth().getDisplayName(TextStyle.SHORT, Locale.US);
    }

    private List<DocCollection> collection(OrgData data) {
        List<DocCollection> out = new ArrayList<>();
        for (DocumentType dt : data.docTypes()) {
            long approved = 0, total = 0;
            for (Provider p : data.providers()) {
                Optional<ProviderDocument> d = data.docsOf(p).stream().filter(x -> dt.getCode().equals(x.getDocType())).findFirst();
                String status = d.map(ProviderDocument::getStatus).orElse("missing");
                if ("na".equals(status)) continue;
                total++;
                if ("approved".equals(status)) approved++;
            }
            out.add(new DocCollection(dt.getCode(), dt.getLabel(), Boolean.TRUE.equals(dt.getCritical()), approved, total,
                    pct(approved, total)));
        }
        return out;
    }

    public List<DocCollection> documentCollection() {
        return collection(load(null));
    }

    // ---------------------------------------------------------------- roster

    private List<RosterRow> rosterRows(String q, String sort) {
        OrgData data = load(q);
        Long orgId = authContext.orgId();
        Map<Long, String> locations = locationRepository.findByOrgId(orgId).stream()
                .collect(Collectors.toMap(Location::getId, Location::getName));
        Map<Long, String> practices = practiceRepository.findByOrgId(orgId).stream()
                .collect(Collectors.toMap(Practice::getId, Practice::getName));
        List<RosterRow> rows = new ArrayList<>(data.providers().stream().map(p -> {
            List<ProviderDocument> docs = data.docsOf(p);
            return new RosterRow(p.getId(), p.getFirstName(), p.getLastName(), p.getSuffix(), BrSupport.providerName(p),
                    p.getSpecialty(), p.getStatus(), BrSupport.statusKey(p.getStatus()), countStatus(docs, "approved"),
                    applicable(docs), p.getEmail(), p.getNpi(), p.getCaqhId(), p.getLocationId(),
                    locations.get(p.getLocationId()), p.getPracticeId(), practices.get(p.getPracticeId()),
                    p.getLicenseNumber(), p.getLicenseState(), p.getLicenseExpires(), p.getDeaExpires(), p.getDateAdded());
        }).toList());
        rows.sort(comparator(sort));
        return rows;
    }

    private static Comparator<RosterRow> comparator(String sort) {
        String field = "name";
        boolean desc = false;
        if (sort != null && !sort.isBlank()) {
            String[] parts = sort.split(",");
            field = parts[0].trim();
            desc = parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim());
        }
        Comparator<RosterRow> c = switch (field) {
            case "name" -> Comparator.comparing((RosterRow r) -> lower(r.lastName()), nullsLast())
                    .thenComparing(r -> lower(r.firstName()), nullsLast());
            case "specialty" -> Comparator.comparing(r -> lower(r.specialty()), nullsLast());
            case "status" -> Comparator.comparing(RosterRow::status, nullsLast());
            case "docs" -> Comparator.comparingDouble(r -> r.docsTotal() == 0 ? 0 : (double) r.docsApproved() / r.docsTotal());
            case "email" -> Comparator.comparing(r -> lower(r.email()), nullsLast());
            case "npi" -> Comparator.comparing(RosterRow::npi, nullsLast());
            case "caqh" -> Comparator.comparing(RosterRow::caqhId, nullsLast());
            case "location" -> Comparator.comparing(r -> lower(r.locationName()), nullsLast());
            case "practice" -> Comparator.comparing(r -> lower(r.practiceName()), nullsLast());
            case "license" -> Comparator.comparing(RosterRow::licenseNumber, nullsLast());
            case "deaExpires" -> Comparator.comparing(RosterRow::deaExpires, nullsLast());
            case "dateAdded" -> Comparator.comparing(RosterRow::dateAdded, nullsLast());
            default -> throw new BadRequestException("Unknown sort field '" + field + "'. Allowed: " + ROSTER_COLUMNS);
        };
        return desc ? c.reversed() : c;
    }

    private static <T extends Comparable<? super T>> Comparator<T> nullsLast() {
        return Comparator.nullsLast(Comparator.naturalOrder());
    }

    private static String lower(String s) {
        return s == null ? null : s.toLowerCase(Locale.ROOT);
    }

    public PageResponse<RosterRow> roster(String q, int page, int size, String sort) {
        return PageResponse.ofList(rosterRows(q, sort), page, Math.min(Math.max(size, 1), 500));
    }

    public ResponseEntity<byte[]> rosterCsv(String q, String columns, String sort) {
        List<String> cols = columns == null || columns.isBlank() ? ROSTER_COLUMNS
                : Arrays.stream(columns.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
        for (String c : cols) {
            if (!ROSTER_COLUMNS.contains(c)) throw new BadRequestException("Unknown column '" + c + "'. Allowed: " + ROSTER_COLUMNS);
        }
        List<String> headers = new ArrayList<>();
        for (String c : cols) {
            switch (c) {
                case "name" -> headers.add("Provider");
                case "specialty" -> headers.add("Specialty");
                case "status" -> headers.add("Status");
                case "docs" -> { headers.add("Documents Met"); headers.add("Documents Total"); }
                case "email" -> headers.add("Email");
                case "npi" -> headers.add("NPI");
                case "caqh" -> headers.add("CAQH ID");
                case "location" -> headers.add("Location");
                case "practice" -> headers.add("Practice");
                case "license" -> headers.add("License");
                case "deaExpires" -> headers.add("DEA Expires");
                case "dateAdded" -> headers.add("Date Added");
                default -> { }
            }
        }
        List<List<Object>> rows = new ArrayList<>();
        for (RosterRow r : rosterRows(q, sort)) {
            List<Object> row = new ArrayList<>();
            for (String c : cols) {
                switch (c) {
                    case "name" -> row.add(r.name());
                    case "specialty" -> row.add(r.specialty());
                    case "status" -> row.add(r.status());
                    case "docs" -> { row.add(r.docsApproved()); row.add(r.docsTotal()); }
                    case "email" -> row.add(r.email());
                    case "npi" -> row.add(r.npi());
                    case "caqh" -> row.add(r.caqhId());
                    case "location" -> row.add(r.locationName());
                    case "practice" -> row.add(r.practiceName());
                    case "license" -> row.add(r.licenseNumber());
                    case "deaExpires" -> row.add(r.deaExpires());
                    case "dateAdded" -> row.add(r.dateAdded());
                    default -> { }
                }
            }
            rows.add(row);
        }
        return BrSupport.csv("provider-roster-" + BrSupport.today() + ".csv", headers, rows);
    }

    // ---------------------------------------------------------------- document status grid

    public DocumentStatus documentStatus(String q) {
        OrgData data = load(q);
        long approved = 0, missing = 0, expired = 0, pending = 0, na = 0;
        List<ProviderDocRow> rows = new ArrayList<>();
        for (Provider p : data.providers()) {
            Map<String, ProviderDocument> byType = data.docsOf(p).stream()
                    .collect(Collectors.toMap(ProviderDocument::getDocType, Function.identity(), (a, b) -> a));
            Map<String, String> statuses = new LinkedHashMap<>();
            for (DocumentType dt : data.docTypes()) {
                ProviderDocument d = byType.get(dt.getCode());
                String s = d == null ? "missing" : d.getStatus();
                statuses.put(dt.getCode(), s);
                switch (s) {
                    case "approved" -> approved++;
                    case "missing" -> missing++;
                    case "expired" -> expired++;
                    case "pending_review" -> pending++;
                    case "na" -> na++;
                    default -> { }
                }
            }
            rows.add(new ProviderDocRow(p.getId(), BrSupport.providerName(p), statuses));
        }
        List<DocTypeApproved> byDocType = collection(data).stream()
                .map(c -> new DocTypeApproved(c.docType(), c.label(), c.approved(), c.total())).toList();
        List<DocTypeRef> refs = data.docTypes().stream()
                .map(dt -> new DocTypeRef(dt.getCode(), dt.getLabel(), Boolean.TRUE.equals(dt.getCritical()))).toList();
        return new DocumentStatus(new DocStatusTotals(approved, missing, expired, pending, na), byDocType, refs, rows);
    }

    // ---------------------------------------------------------------- payer enrollment

    public PayerEnrollment payerEnrollment() {
        authContext.requireStaff();
        List<Enrollment> enrollments = enrollmentRepository.findByOrgId(authContext.orgId());
        Map<String, Long> byStatus = new TreeMap<>();
        enrollments.forEach(e -> byStatus.merge(e.getStatus(), 1L, Long::sum));
        List<Integer> approvedTats = enrollments.stream().filter(e -> "approved".equals(e.getStatus()))
                .map(BrSupport::tatDays).filter(Objects::nonNull).toList();

        Map<Long, List<Enrollment>> byPayerId = enrollments.stream().collect(Collectors.groupingBy(Enrollment::getPayerId));
        List<PayerRow> payerRows = new ArrayList<>();
        for (Payer p : payerRepository.findAllByOrderBySortOrderAsc()) {
            List<Enrollment> list = byPayerId.getOrDefault(p.getId(), List.of());
            if (list.isEmpty()) continue;
            Map<String, Long> s = list.stream().collect(Collectors.groupingBy(Enrollment::getStatus, Collectors.counting()));
            List<Integer> tats = list.stream().filter(e -> "approved".equals(e.getStatus()))
                    .map(BrSupport::tatDays).filter(Objects::nonNull).toList();
            payerRows.add(new PayerRow(p.getId(), p.getCode(), p.getName(), p.getColor(), list.size(),
                    s.getOrDefault("draft", 0L), s.getOrDefault("in_progress", 0L), s.getOrDefault("submitted", 0L),
                    s.getOrDefault("approved", 0L), s.getOrDefault("needs_attention", 0L), s.getOrDefault("on_hold", 0L),
                    s.getOrDefault("terminated", 0L), BrSupport.avg(tats), p.getAvgTatDays()));
        }
        payerRows.sort(Comparator.comparingLong(PayerRow::total).reversed());

        List<MonthPoint> trend = new ArrayList<>();
        YearMonth now = YearMonth.from(BrSupport.today());
        for (int i = 11; i >= 0; i--) {
            YearMonth ym = now.minusMonths(i);
            long submitted = enrollments.stream()
                    .filter(e -> e.getSubmittedDate() != null && YearMonth.from(e.getSubmittedDate()).equals(ym)).count();
            long approved = enrollments.stream().filter(e -> "approved".equals(e.getStatus())
                    && e.getEffectiveDate() != null && YearMonth.from(e.getEffectiveDate()).equals(ym)).count();
            trend.add(new MonthPoint(ym.toString(), monthLabel(ym), submitted, approved));
        }

        return new PayerEnrollment(enrollments.size(), byStatus, byStatus.getOrDefault("in_progress", 0L),
                byStatus.getOrDefault("submitted", 0L), byStatus.getOrDefault("approved", 0L),
                byStatus.getOrDefault("needs_attention", 0L), BrSupport.avg(approvedTats), approvedTats.size(),
                payerRows, trend);
    }

    // ---------------------------------------------------------------- reappointments

    public Reappointments reappointments(String q) {
        OrgData data = load(q);
        LocalDate today = BrSupport.today();
        long overdue = 0, soon = 0, current = 0, none = 0;
        List<ReappointmentRow> rows = new ArrayList<>();
        for (Provider p : data.providers()) {
            LocalDate last = p.getDateAdded();
            LocalDate next = last == null ? null : last.plusDays(REAPPOINTMENT_CYCLE_DAYS);
            Long daysLeft = next == null ? null : ChronoUnit.DAYS.between(today, next);
            String status, label;
            if (daysLeft == null) { status = "not_scheduled"; label = "Not scheduled"; none++; }
            else if (daysLeft < 0) { status = "overdue"; label = "Overdue"; overdue++; }
            else if (daysLeft < 90) { status = "due_soon"; label = "Due Soon"; soon++; }
            else { status = "current"; label = "Current"; current++; }
            rows.add(new ReappointmentRow(p.getId(), BrSupport.providerName(p), p.getSpecialty(), last, next, daysLeft,
                    status, label));
        }
        rows.sort(Comparator.comparing(ReappointmentRow::daysLeft, Comparator.nullsLast(Comparator.naturalOrder())));
        return new Reappointments(overdue, soon, current, none, rows);
    }
}
