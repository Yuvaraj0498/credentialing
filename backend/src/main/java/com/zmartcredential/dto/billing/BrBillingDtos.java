package com.zmartcredential.dto.billing;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Billing module requests/responses. */
public final class BrBillingDtos {

    private BrBillingDtos() {
    }

    // ----- packages & subscription -----
    public record PackageDto(String id, String name, BigDecimal basePrice, BigDecimal perProvider, String color,
                             String colorSoft, boolean recommended, Integer providerCap, Integer payerCap,
                             Integer aiUploadsPerMonth, String primarySupport, List<String> features,
                             List<String> notIncluded, boolean current) {
    }

    public record SubscriptionDto(String packageId, String packageName, String color, String colorSoft,
                                  BigDecimal basePrice, BigDecimal perProvider, int providerCount,
                                  BigDecimal monthlyTotal, String status, LocalDateTime startedAt,
                                  LocalDate nextRenewalDate, Integer providerCap, Integer payerCap,
                                  Integer aiUploadsPerMonth, String primarySupport, long activeProviders) {
    }

    public record UpdateSubscriptionRequest(
            @NotBlank(message = "Choose a plan")
            String packageId,
            @NotNull(message = "Provider count is required")
            @Min(value = 1, message = "Provider count must be at least 1")
            @Max(value = 100000, message = "Provider count is too large")
            Integer providerCount) {
    }

    // ----- overview -----
    public record Usage(int aiUploadsThisMonth, Integer aiUploadsLimit) {
    }

    public record ProviderUsage(long active, Integer cap) {
    }

    public record Outstanding(long count, BigDecimal amount) {
    }

    public record MonthSpend(int month, String label, BigDecimal amount) {
    }

    public record Overview(SubscriptionDto subscription, Usage usage, ProviderUsage providers, Outstanding outstanding,
                           BigDecimal paidThisYear, BigDecimal totalBilled, BigDecimal totalPaid, long invoiceCount,
                           long paidCount, int year, List<MonthSpend> spendByMonth, List<InvoiceSummary> recentInvoices) {
    }

    // ----- invoices -----
    public record InvoiceSummary(Long id, String number, LocalDate invoiceDate, LocalDate dueDate, String status,
                                 LocalDate paidDate, String paidMethodLabel, BigDecimal subtotal, BigDecimal tax,
                                 BigDecimal total, int lineCount) {
    }

    public record InvoiceLineDto(Long id, String lineType, String description, String packageId, String packageName,
                                 BigDecimal basePrice, BigDecimal perProvider, Integer providerCount,
                                 LocalDate periodStart, LocalDate periodEnd, Long providerId, String providerName,
                                 Long payerId, String payerName, String payerCategory, String stateCode,
                                 String serviceType, BigDecimal amount) {
    }

    public record Party(String name, String address, String city, String state, String zip, String email, String phone) {
    }

    public record InvoiceDetail(InvoiceSummary invoice, Long paymentMethodId, Party from, Party billTo,
                                List<InvoiceLineDto> lines) {
    }

    public record PayInvoiceRequest(Long paymentMethodId) {
    }

    public record DeferredResponse(String integration, String message, Long invoiceId, String status) {
    }

    public record MarkPaidRequest(
            Long paymentMethodId,
            @PastOrPresent(message = "Paid date cannot be in the future")
            LocalDate paidDate) {
    }

    // ----- payment methods -----
    public record PaymentMethodDto(Long id, String brand, String last4, String exp, String billingName,
                                   String billingZip, boolean isDefault, boolean expired, LocalDateTime createdAt) {
    }

    public record AddPaymentMethodRequest(
            @NotBlank(message = "Card brand is required")
            @Pattern(regexp = "Visa|Mastercard|Amex|Discover|Card", message = "Brand must be Visa, Mastercard, Amex, Discover or Card")
            String brand,
            @NotBlank(message = "Last 4 digits are required")
            @Pattern(regexp = "\\d{4}", message = "Last 4 must be exactly 4 digits")
            String last4,
            @NotBlank(message = "Expiration is required")
            @Pattern(regexp = "(0[1-9]|1[0-2])/\\d{2}", message = "Invalid expiration (MM/YY)")
            String exp,
            @NotBlank(message = "Cardholder name required")
            @Size(max = 150, message = "Cardholder name is too long")
            String billingName,
            @NotBlank(message = "ZIP is required")
            @Pattern(regexp = "\\d{5}", message = "Invalid ZIP")
            String billingZip) {
    }

    // ----- provider billing widget -----
    public record ProviderServiceLine(Long lineId, Long invoiceId, String invoiceNumber, LocalDate date,
                                  String invoiceStatus, Long payerId, String payerName, String payerCategory,
                                  String stateCode, String serviceType, BigDecimal amount) {
    }

    public record EstimatedService(Long enrollmentId, Long payerId, String payerName, String payerColor,
                                   String payerCategory, String enrollmentStatus, LocalDate submittedDate,
                                   String serviceType, BigDecimal amount) {
    }

    public record ProviderBilling(Long providerId, String stateCode, List<ProviderServiceLine> services,
                                  BigDecimal totalBilled, BigDecimal totalPaid, BigDecimal totalOutstanding,
                                  List<EstimatedService> estimatedItems, BigDecimal estimatedUpcoming) {
    }
}
