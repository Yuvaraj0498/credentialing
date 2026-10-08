package com.zmartcredential.controller;

import com.zmartcredential.dto.billing.BrBillingDtos.*;
import com.zmartcredential.common.PageResponse;
import com.zmartcredential.service.BrBillingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Billing")
public class BrBillingController {

    private final BrBillingService service;

    @GetMapping("/api/billing/overview")
    @Operation(summary = "Billing overview: subscription, usage, outstanding, spend by month, recent invoices")
    public Overview overview() {
        return service.overview();
    }

    @GetMapping("/api/billing/packages")
    @Operation(summary = "Subscription packages with features")
    public List<PackageDto> packages() {
        return service.packages();
    }

    @GetMapping("/api/billing/subscription")
    @Operation(summary = "Current subscription")
    public SubscriptionDto subscription() {
        return service.subscription();
    }

    @PutMapping("/api/billing/subscription")
    @Operation(summary = "Change plan / provider count")
    public SubscriptionDto updateSubscription(@Valid @RequestBody UpdateSubscriptionRequest req) {
        return service.updateSubscription(req);
    }

    @GetMapping("/api/billing/invoices")
    @Operation(summary = "Invoices (newest first)")
    public PageResponse<InvoiceSummary> invoices(@RequestParam(required = false) String status,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        return service.invoices(status, page, size);
    }

    @GetMapping("/api/billing/invoices/export.csv")
    @Operation(summary = "Invoices CSV export")
    public ResponseEntity<byte[]> invoicesCsv(@RequestParam(required = false) String status) {
        return service.invoicesCsv(status);
    }

    @GetMapping("/api/billing/invoices/{id}")
    @Operation(summary = "Invoice detail with all lines")
    public InvoiceDetail invoice(@PathVariable Long id) {
        return service.invoice(id);
    }

    @PostMapping("/api/billing/invoices/{id}/pay")
    @Operation(summary = "Pay an invoice by card (deferred integration; changes nothing)")
    public DeferredResponse pay(@PathVariable Long id, @RequestBody(required = false) PayInvoiceRequest req) {
        return service.pay(id, req);
    }

    @PostMapping("/api/admin/invoices/{id}/mark-paid")
    @Operation(summary = "Platform admin: manually mark an invoice paid")
    public InvoiceSummary markPaid(@PathVariable Long id, @Valid @RequestBody(required = false) MarkPaidRequest req) {
        return service.markPaid(id, req);
    }

    @GetMapping("/api/billing/payment-methods")
    @Operation(summary = "Saved card metadata")
    public List<PaymentMethodDto> paymentMethods() {
        return service.paymentMethods();
    }

    @PostMapping("/api/billing/payment-methods")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add card metadata (no PAN/CVC)")
    public PaymentMethodDto addPaymentMethod(@Valid @RequestBody AddPaymentMethodRequest req) {
        return service.addPaymentMethod(req);
    }

    @PatchMapping("/api/billing/payment-methods/{id}/default")
    @Operation(summary = "Make a card the default")
    public List<PaymentMethodDto> setDefault(@PathVariable Long id) {
        return service.setDefault(id);
    }

    @DeleteMapping("/api/billing/payment-methods/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove a card")
    public void deletePaymentMethod(@PathVariable Long id) {
        service.deletePaymentMethod(id);
    }

    @GetMapping("/api/providers/{id}/billing")
    @Operation(summary = "Provider billing widget: billed services and unbilled estimates")
    public ProviderBilling providerBilling(@PathVariable Long id) {
        return service.providerBilling(id);
    }
}
