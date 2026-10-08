package com.zmartcredential.service;

import com.zmartcredential.dto.report.BrDashboardDtos.*;
import com.zmartcredential.entity.*;
import com.zmartcredential.repository.*;
import com.zmartcredential.security.AuthContext;
import com.zmartcredential.security.AuthPrincipal;
import com.zmartcredential.security.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BrDashboardService {

    private final AuthContext authContext;
    private final ProviderRepository providerRepository;
    private final ProviderDocumentRepository providerDocumentRepository;
    private final DocumentTypeRepository documentTypeRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final PayerRepository payerRepository;
    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;
    private final InvoiceRepository invoiceRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatReadRepository chatReadRepository;

    public Summary summary() {
        authContext.requireStaff();
        Long orgId = authContext.orgId();
        LocalDate today = BrSupport.today();

        List<Provider> providers = providerRepository.findByOrgId(orgId);
        Map<Long, Provider> providerById = providers.stream().collect(Collectors.toMap(Provider::getId, Function.identity()));
        List<ProviderDocument> docs = providers.isEmpty() ? List.of()
                : providerDocumentRepository.findByProviderIdIn(providerById.keySet());
        Map<String, String> docLabels = documentTypeRepository.findAll().stream()
                .collect(Collectors.toMap(DocumentType::getCode, DocumentType::getLabel));
        List<Enrollment> enrollments = enrollmentRepository.findByOrgId(orgId);
        List<Payer> payers = payerRepository.findAllByOrderBySortOrderAsc();

        // documents
        long total = 0, approved = 0, missing = 0, expired = 0, pending = 0;
        List<Expiration> expirations = new ArrayList<>();
        for (ProviderDocument d : docs) {
            String s = d.getStatus();
            if ("na".equals(s)) continue;
            total++;
            switch (s) {
                case "approved" -> approved++;
                case "missing" -> missing++;
                case "expired" -> expired++;
                case "pending_review" -> pending++;
                default -> { }
            }
            if ("approved".equals(s) && d.getExpiresAt() != null) {
                long days = ChronoUnit.DAYS.between(today, d.getExpiresAt());
                if (days <= 90) {
                    Provider p = providerById.get(d.getProviderId());
                    expirations.add(new Expiration(d.getProviderId(), p == null ? "" : BrSupport.providerName(p),
                            d.getDocType(), docLabels.getOrDefault(d.getDocType(), d.getDocType()), d.getExpiresAt(), days));
                }
            }
        }
        expirations.sort(Comparator.comparingLong(Expiration::daysLeft));

        // enrollments
        Map<String, Long> byStatus = new TreeMap<>();
        enrollments.forEach(e -> byStatus.merge(e.getStatus(), 1L, Long::sum));
        List<Integer> tats = enrollments.stream().map(BrSupport::tatDays).filter(Objects::nonNull).toList();

        Map<Long, List<Enrollment>> byPayer = enrollments.stream().collect(Collectors.groupingBy(Enrollment::getPayerId));
        List<PayerEnrollmentCount> payerCounts = new ArrayList<>();
        List<PayerTat> payerTat = new ArrayList<>();
        for (Payer payer : payers) {
            List<Enrollment> list = byPayer.getOrDefault(payer.getId(), List.of());
            if (list.isEmpty()) continue;
            payerCounts.add(new PayerEnrollmentCount(payer.getId(), payer.getCode(), payer.getName(), payer.getColor(),
                    count(list, "approved"), count(list, "in_progress"), count(list, "submitted"), list.size()));
            List<Integer> pt = list.stream().map(BrSupport::tatDays).filter(Objects::nonNull).toList();
            payerTat.add(new PayerTat(payer.getId(), payer.getName(), payer.getColor(), BrSupport.avg(pt), pt.size(),
                    payer.getAvgTatDays()));
        }
        payerCounts.sort(Comparator.comparingLong(PayerEnrollmentCount::total).reversed());
        payerTat.sort(Comparator.comparingLong(PayerTat::count).reversed());

        StatCards stats = new StatCards(
                providers.size(),
                providers.stream().filter(p -> "active".equals(p.getStatus())).count(),
                providers.stream().filter(p -> "draft".equals(p.getStatus()) || "in_progress".equals(p.getStatus())).count(),
                enrollments.stream().filter(e -> BrSupport.ACTIVE_ENROLLMENT.contains(e.getStatus())).count(),
                byStatus.getOrDefault("approved", 0L),
                byStatus.getOrDefault("needs_attention", 0L),
                BrSupport.avg(tats),
                taskRepository.countByOrgIdAndStatus(orgId, "open"),
                missing,
                expirations.size());

        return new Summary(stats, new DocCounts(total, approved, missing, expired, pending), byStatus,
                payerCounts, payerTat, expirations.size(), expirations.stream().limit(8).toList());
    }

    private static long count(List<Enrollment> list, String status) {
        return list.stream().filter(e -> status.equals(e.getStatus())).count();
    }

    public Counters counters() {
        AuthPrincipal p = authContext.principal();
        Long orgId = authContext.orgIdOrNull();
        if (orgId == null) return new Counters(0, 0, 0, 0);
        if (p.isProvider()) {
            // provider users only see notifications addressed to them (same rule as the notification inbox)
            long own = notificationRepository.findVisibleToUser(orgId, p.userId()).stream()
                    .filter(n -> p.userId().equals(n.getUserId()) && !Boolean.TRUE.equals(n.getRead())).count();
            return new Counters(0, own, 0, 0);
        }
        long unreadNotifications = notificationRepository.countUnreadVisibleToUser(orgId, p.userId());

        long openTasks = taskRepository.countByOrgIdAndStatus(orgId, "open");
        long outstanding = authContext.hasRole(Role.PLATFORM_ADMIN, Role.ORG_ADMIN, Role.AUDITOR)
                ? invoiceRepository.countByOrgIdAndStatusNotIn(orgId, List.of("paid")) : 0;
        return new Counters(openTasks, unreadNotifications, outstanding, unreadChat(orgId, p.userId()));
    }

    /**
     * Unread messages by others in channels and in DMs the user takes part in, after the user's read mark
     * (by message id; legacy marks without an id fall back to the read time). Same rule as the chat state.
     */
    private long unreadChat(Long orgId, Long userId) {
        Map<String, ChatRead> lastRead = chatReadRepository.findByUserId(userId).stream()
                .collect(Collectors.toMap(ChatRead::getConversationId, r -> r, (a, b) -> a));
        String me = String.valueOf(userId);
        long count = 0;
        for (ChatMessage m : chatMessageRepository.findByOrgIdAndAuthorIdNot(orgId, userId)) {
            String conv = m.getConversationId();
            if (conv == null) continue;
            boolean visible;
            if (conv.startsWith("ch_")) {
                visible = true;
            } else if (conv.startsWith("dm_")) {
                String[] ids = conv.substring(3).split("__");
                visible = ids.length == 2 && (ids[0].equals(me) || ids[1].equals(me));
            } else {
                visible = false;
            }
            if (!visible) continue;
            ChatRead read = lastRead.get(conv);
            boolean unread;
            if (read == null) unread = true;
            else if (read.getLastReadMessageId() != null) unread = m.getId() > read.getLastReadMessageId();
            else unread = m.getCreatedAt() != null && read.getLastReadAt() != null && m.getCreatedAt().isAfter(read.getLastReadAt());
            if (unread) count++;
        }
        return count;
    }
}
