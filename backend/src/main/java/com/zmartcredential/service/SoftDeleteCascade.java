package com.zmartcredential.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * With soft delete the database no longer cascades: what a real delete used to do to related rows
 * (ON DELETE CASCADE / SET NULL) is done here, so lists never show rows of a deleted record.
 */
@Component
public class SoftDeleteCascade {

    @PersistenceContext
    private EntityManager em;

    /** Rows that belonged to the provider (they were removed with it before). */
    private static final List<String> PROVIDER_CHILDREN = List.of("Enrollment", "ProviderDocument", "PayerSubmission",
            "PayerCredential", "ProviderInvite", "TimeEntry", "ProviderPrivilege", "FollowUp", "GeneratedLetter",
            "VerificationCheck", "CaqhPayerAuthorization", "AttestationReminderLog");

    public void provider(Long providerId) {
        for (String entity : PROVIDER_CHILDREN) softDeleteWhere(entity, "providerId", providerId);
        // the provider's sign-in goes with the provider
        for (Object u : select("AppUser", "providerId", providerId)) {
            com.zmartcredential.entity.AppUser user = (com.zmartcredential.entity.AppUser) u;
            user.setDelToken(user.getId());
            em.flush();
            em.remove(user);
        }
        update("update Task set providerId = null where providerId = :id", providerId);
        update("update InvoiceLine set providerId = null where providerId = :id", providerId);
        // links only (no history): removed as before
        update("delete from ReminderScheduleProvider where providerId = :id", providerId);
        em.createNativeQuery("DELETE FROM payer_credential_provider WHERE provider_id = ?1").setParameter(1, providerId).executeUpdate();
    }

    public void user(Long userId) {
        update("update Enrollment set assignedUserId = null where assignedUserId = :id", userId);
        update("update Task set assigneeUserId = null where assigneeUserId = :id", userId);
    }

    public void practice(Long practiceId) {
        update("update Enrollment set practiceId = null where practiceId = :id", practiceId);
    }

    public void hospital(Long hospitalId) {
        softDeleteWhere("ProviderPrivilege", "hospitalId", hospitalId);
        update("update GeneratedLetter set hospitalId = null where hospitalId = :id", hospitalId);
    }

    public void enrollment(Long enrollmentId) {
        update("update PayerSubmission set enrollmentId = null where enrollmentId = :id", enrollmentId);
    }

    public void payer(Long payerId) {
        softDeleteWhere("PayerCredential", "payerId", payerId);
        softDeleteWhere("CaqhPayerAuthorization", "payerId", payerId);
    }

    private List<?> select(String entity, String field, Long id) {
        return em.createQuery("select x from " + entity + " x where x." + field + " = :id").setParameter("id", id).getResultList();
    }

    private void softDeleteWhere(String entity, String field, Long id) {
        select(entity, field, id).forEach(em::remove);
    }

    private void update(String hql, Long id) {
        em.createQuery(hql).setParameter("id", id).executeUpdate();
    }
}
