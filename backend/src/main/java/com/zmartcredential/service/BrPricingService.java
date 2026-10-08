package com.zmartcredential.service;

import com.zmartcredential.dto.billing.BrPricingDtos.*;
import com.zmartcredential.entity.Payer;
import com.zmartcredential.entity.PricingBaseRate;
import com.zmartcredential.entity.PricingState;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.exception.NotFoundException;
import com.zmartcredential.repository.PayerRepository;
import com.zmartcredential.repository.PricingBaseRateRepository;
import com.zmartcredential.repository.PricingStateRepository;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Credentialing service pricing: price = roundTo5(base[category][serviceType] x state.mult x payer.mult).
 * Unknown state falls back to TX; payers without a pricing category price at 0 (and are excluded from the matrix).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BrPricingService {

    public static final List<String> CATEGORIES = List.of("medicare", "medicaid", "commercial");
    public static final List<String> SERVICE_TYPES = List.of("new", "recred");
    public static final List<String> REGIONS = List.of("northeast", "south", "midwest", "west");
    public static final String FALLBACK_STATE = "TX";
    private static final BigDecimal FIVE = BigDecimal.valueOf(5);

    private final AuthContext authContext;
    private final PricingStateRepository stateRepository;
    private final PricingBaseRateRepository baseRateRepository;
    private final PayerRepository payerRepository;
    private final BrSupport support;

    // ---------------------------------------------------------------- core formula (no permission checks)

    public static BigDecimal roundTo5(BigDecimal n) {
        return n.divide(FIVE, 0, RoundingMode.HALF_UP).multiply(FIVE).setScale(2, RoundingMode.UNNECESSARY);
    }

    /** Lookup tables loaded once per request/computation. */
    public record Tables(Map<String, PricingState> states, Map<String, BigDecimal> base) {
        PricingState state(String code) {
            PricingState s = code == null ? null : states.get(code.toUpperCase(Locale.ROOT));
            return s != null ? s : states.get(FALLBACK_STATE);
        }

        public BigDecimal price(String stateCode, Payer payer, String serviceType) {
            if (payer == null || payer.getPricingCategory() == null) return BigDecimal.ZERO.setScale(2);
            BigDecimal b = base.get(payer.getPricingCategory() + ":" + serviceType);
            PricingState s = state(stateCode);
            if (b == null || s == null) return BigDecimal.ZERO.setScale(2);
            BigDecimal pm = payer.getPricingMult() == null ? BigDecimal.ONE : payer.getPricingMult();
            return roundTo5(b.multiply(s.getMult()).multiply(pm));
        }
    }

    public Tables tables() {
        Map<String, PricingState> states = new LinkedHashMap<>();
        stateRepository.findAllByOrderByCodeAsc().forEach(s -> states.put(s.getCode(), s));
        Map<String, BigDecimal> base = new HashMap<>();
        baseRateRepository.findAll().forEach(r -> base.put(r.getCategory() + ":" + r.getServiceType(), r.getAmount()));
        return new Tables(states, base);
    }

    private static void validateServiceType(String serviceType) {
        if (!SERVICE_TYPES.contains(serviceType)) throw new BadRequestException("serviceType must be 'new' or 'recred'");
    }

    private List<Payer> pricedPayers() {
        return payerRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .filter(p -> p.getPricingCategory() != null).toList();
    }

    private static PricingPayerDto payerDto(Payer p) {
        return new PricingPayerDto(p.getId(), p.getCode(), p.getName(), p.getColor(), p.getPricingCategory(), p.getPricingMult());
    }

    private static StateDto stateDto(PricingState s) {
        return new StateDto(s.getCode(), s.getName(), s.getMult(), s.getRegion());
    }

    // ---------------------------------------------------------------- reads (any staff)

    public List<StateDto> states() {
        authContext.requireStaff();
        return stateRepository.findAllByOrderByCodeAsc().stream().map(BrPricingService::stateDto).toList();
    }

    public List<BaseRateDto> baseRates() {
        authContext.requireStaff();
        return baseRateRepository.findAll().stream()
                .sorted(Comparator.comparing((PricingBaseRate r) -> CATEGORIES.indexOf(r.getCategory()))
                        .thenComparing(r -> SERVICE_TYPES.indexOf(r.getServiceType())))
                .map(r -> new BaseRateDto(r.getCategory(), r.getServiceType(), r.getAmount())).toList();
    }

    public List<PricingPayerDto> payers() {
        authContext.requireStaff();
        return pricedPayers().stream().map(BrPricingService::payerDto).toList();
    }

    public Matrix matrix(String serviceType, String region, String q) {
        authContext.requireStaff();
        validateServiceType(serviceType);
        if (region != null && !region.isBlank() && !"all".equals(region) && !REGIONS.contains(region)) {
            throw new BadRequestException("region must be one of all, " + String.join(", ", REGIONS));
        }
        Tables t = tables();
        List<Payer> payers = pricedPayers();
        String s = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        List<MatrixRow> rows = new ArrayList<>();
        for (PricingState st : t.states().values()) {
            if (region != null && !region.isBlank() && !"all".equals(region) && !region.equals(st.getRegion())) continue;
            if (!s.isEmpty() && !st.getCode().toLowerCase(Locale.ROOT).contains(s)
                    && !st.getName().toLowerCase(Locale.ROOT).contains(s)) continue;
            List<PriceCell> cells = payers.stream().map(p -> new PriceCell(p.getId(), t.price(st.getCode(), p, serviceType))).toList();
            BigDecimal min = cells.stream().map(PriceCell::price).min(Comparator.naturalOrder()).orElse(null);
            BigDecimal max = cells.stream().map(PriceCell::price).max(Comparator.naturalOrder()).orElse(null);
            rows.add(new MatrixRow(st.getCode(), st.getName(), st.getRegion(), st.getMult(), cells, min, max));
        }
        return new Matrix(serviceType, payers.stream().map(BrPricingService::payerDto).toList(), rows, t.states().size());
    }

    public Quote quote(String state, String payerRef, String serviceType) {
        authContext.requireStaff();
        validateServiceType(serviceType);
        if (payerRef == null || payerRef.isBlank()) throw new BadRequestException("payerId is required");
        Payer payer = findPayer(payerRef);
        Tables t = tables();
        PricingState resolved = t.state(state);
        boolean fallback = state == null || !t.states().containsKey(state.toUpperCase(Locale.ROOT));
        BigDecimal base = payer.getPricingCategory() == null ? null : t.base().get(payer.getPricingCategory() + ":" + serviceType);
        return new Quote(state, resolved == null ? null : resolved.getCode(), fallback, payer.getId(), payer.getName(),
                payer.getPricingCategory(), serviceType, base, resolved == null ? null : resolved.getMult(),
                payer.getPricingMult(), t.price(state, payer, serviceType));
    }

    private Payer findPayer(String ref) {
        String r = ref.trim();
        if (r.chars().allMatch(Character::isDigit)) {
            return payerRepository.findById(Long.parseLong(r)).orElseThrow(() -> NotFoundException.of("Payer", r));
        }
        return payerRepository.findByCode(r).orElseThrow(() -> NotFoundException.of("Payer", r));
    }

    public ResponseEntity<byte[]> matrixCsv(String serviceType) {
        authContext.requireStaff();
        List<String> types = serviceType == null || serviceType.isBlank() ? SERVICE_TYPES : List.of(serviceType);
        types.forEach(BrPricingService::validateServiceType);
        Tables t = tables();
        List<Payer> payers = pricedPayers();
        List<String> headers = new ArrayList<>(List.of("State Code", "State Name", "State Mult"));
        for (String type : types) {
            String suffix = "new".equals(type) ? " (New)" : " (Recred)";
            payers.forEach(p -> headers.add(p.getName() + suffix));
        }
        List<List<Object>> rows = new ArrayList<>();
        for (PricingState st : t.states().values()) {
            List<Object> row = new ArrayList<>(List.of(st.getCode(), st.getName(), st.getMult()));
            for (String type : types) payers.forEach(p -> row.add(t.price(st.getCode(), p, type)));
            rows.add(row);
        }
        return BrSupport.csv("pricing-matrix-" + BrSupport.today() + ".csv", headers, rows);
    }

    // ---------------------------------------------------------------- platform admin edits

    @Transactional
    public StateDto updateState(String code, UpdateStateRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        PricingState st = stateRepository.findById(code.toUpperCase(Locale.ROOT))
                .orElseThrow(() -> NotFoundException.of("Pricing state", code));
        BigDecimal old = st.getMult();
        st.setMult(req.mult());
        stateRepository.save(st);
        support.audit(null, "pricing_state", null, "update", "State " + st.getCode() + " multiplier " + old + " -> " + req.mult());
        return stateDto(st);
    }

    @Transactional
    public BaseRateDto updateBaseRate(String category, String serviceType, UpdateBaseRateRequest req) {
        authContext.requireRole(Role.PLATFORM_ADMIN);
        if (!CATEGORIES.contains(category)) throw new BadRequestException("category must be one of " + CATEGORIES);
        validateServiceType(serviceType);
        PricingBaseRate.Key key = new PricingBaseRate.Key();
        key.setCategory(category);
        key.setServiceType(serviceType);
        PricingBaseRate rate = baseRateRepository.findById(key).orElseGet(() -> {
            PricingBaseRate r = new PricingBaseRate();
            r.setCategory(category);
            r.setServiceType(serviceType);
            return r;
        });
        BigDecimal old = rate.getAmount();
        rate.setAmount(req.amount());
        baseRateRepository.save(rate);
        support.audit(null, "pricing_base_rate", null, "update",
                "Base rate " + category + "/" + serviceType + " " + old + " -> " + req.amount());
        return new BaseRateDto(category, serviceType, rate.getAmount());
    }
}
