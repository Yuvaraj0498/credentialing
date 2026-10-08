package com.zmartcredential.controller;

import com.zmartcredential.dto.billing.BrPricingDtos.*;
import com.zmartcredential.service.BrPricingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Pricing")
public class BrPricingController {

    private final BrPricingService service;

    @GetMapping("/api/pricing/states")
    @Operation(summary = "Pricing states with multiplier and region")
    public List<StateDto> states() {
        return service.states();
    }

    @GetMapping("/api/pricing/base-rates")
    @Operation(summary = "Base rates by payer category and service type")
    public List<BaseRateDto> baseRates() {
        return service.baseRates();
    }

    @GetMapping("/api/pricing/payers")
    @Operation(summary = "Payers that have a pricing category")
    public List<PricingPayerDto> payers() {
        return service.payers();
    }

    @GetMapping("/api/pricing/matrix")
    @Operation(summary = "State x payer price matrix")
    public Matrix matrix(@RequestParam(defaultValue = "new") String serviceType,
                         @RequestParam(required = false) String region,
                         @RequestParam(required = false) String q) {
        return service.matrix(serviceType, region, q);
    }

    @GetMapping("/api/pricing/quote")
    @Operation(summary = "Price for one state / payer / service type")
    public Quote quote(@RequestParam(required = false) String state,
                       @RequestParam String payerId,
                       @RequestParam(defaultValue = "new") String serviceType) {
        return service.quote(state, payerId, serviceType);
    }

    @GetMapping("/api/pricing/matrix/export.csv")
    @Operation(summary = "Pricing matrix CSV (both service types when serviceType omitted)")
    public ResponseEntity<byte[]> matrixCsv(@RequestParam(required = false) String serviceType) {
        return service.matrixCsv(serviceType);
    }

    @PutMapping("/api/admin/pricing/states/{code}")
    @Operation(summary = "Platform admin: update a state multiplier")
    public StateDto updateState(@PathVariable String code, @Valid @RequestBody UpdateStateRequest req) {
        return service.updateState(code, req);
    }

    @PutMapping("/api/admin/pricing/base-rates/{category}/{serviceType}")
    @Operation(summary = "Platform admin: update a base rate")
    public BaseRateDto updateBaseRate(@PathVariable String category, @PathVariable String serviceType,
                                      @Valid @RequestBody UpdateBaseRateRequest req) {
        return service.updateBaseRate(category, serviceType, req);
    }
}
