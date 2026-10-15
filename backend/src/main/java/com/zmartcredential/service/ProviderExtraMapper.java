package com.zmartcredential.service;

import com.zmartcredential.dto.provider.ProviderExtraDtos.ProviderExtraInput;
import com.zmartcredential.dto.provider.ProviderExtraDtos.ProviderExtraView;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.exception.BadRequestException;
import com.zmartcredential.util.PhoneNumber;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Map;

import static com.zmartcredential.service.ProviderModuleSupport.blankToNull;

/** The more-provider-details block: form values onto the provider, and the provider's values for the page. */
@Component
@RequiredArgsConstructor
public class ProviderExtraMapper {

    private final CryptoService cryptoService;

    /** null = leave everything as it is (an older client that doesn't send the block). */
    public void apply(Provider p, ProviderExtraInput in) {
        if (in == null) return;
        for (Map.Entry<String, String> phone : Map.of(
                "medicarePhone", nz(in.medicarePhone()), "practiceManagerContact", nz(in.practiceManagerContact()),
                "practicePhone", nz(in.practicePhone()), "practiceFax", nz(in.practiceFax()),
                "billingPhone", nz(in.billingPhone()), "billingFax", nz(in.billingFax())).entrySet()) {
            if (!phone.getValue().isBlank() && !PhoneNumber.isValid(phone.getValue())) {
                throw BadRequestException.onField("extra." + phone.getKey(), "Must be 10 digits");
            }
        }
        if (in.practiceStartDate() != null && in.practiceStartDate().isAfter(LocalDate.now())) {
            throw BadRequestException.onField("extra.practiceStartDate", "Can't be a future date");
        }
        p.setTaxonomyCode(blankToNull(in.taxonomyCode()));
        p.setGroupName(blankToNull(in.groupName()));
        p.setGroupNpi(blankToNull(in.groupNpi()));
        p.setTaxId(blankToNull(in.taxId()));
        p.setHomeAddress(blankToNull(in.homeAddress()));
        p.setHomeCity(blankToNull(in.homeCity()));
        p.setHomeState(upper(in.homeState()));
        p.setHomeZip(blankToNull(in.homeZip()));
        p.setMedicarePhone(blankToNull(in.medicarePhone()));
        p.setMedicaidNumber(blankToNull(in.medicaidNumber()));
        p.setMedicarePtan(blankToNull(in.medicarePtan()));
        p.setDrivingLicense(blankToNull(in.drivingLicense()));
        p.setPracticeLegalName(blankToNull(in.practiceLegalName()));
        p.setPracticeDbaName(blankToNull(in.practiceDbaName()));
        p.setPracticeOwnerName(blankToNull(in.practiceOwnerName()));
        p.setPracticeManagerName(blankToNull(in.practiceManagerName()));
        p.setPracticeManagerContact(blankToNull(in.practiceManagerContact()));
        p.setPracticeAddress(blankToNull(in.practiceAddress()));
        p.setPracticeCity(blankToNull(in.practiceCity()));
        p.setPracticeState(upper(in.practiceState()));
        p.setPracticeZip(blankToNull(in.practiceZip()));
        p.setPracticePhone(blankToNull(in.practicePhone()));
        p.setPracticeFax(blankToNull(in.practiceFax()));
        p.setPracticeEmail(lower(in.practiceEmail()));
        p.setPracticeStartDate(in.practiceStartDate());
        p.setOfficeHours(blankToNull(in.officeHours()));
        p.setBillingAddress(blankToNull(in.billingAddress()));
        p.setBillingCity(blankToNull(in.billingCity()));
        p.setBillingState(upper(in.billingState()));
        p.setBillingZip(blankToNull(in.billingZip()));
        p.setBillingPhone(blankToNull(in.billingPhone()));
        p.setBillingFax(blankToNull(in.billingFax()));
        p.setBillingEmail(lower(in.billingEmail()));
        p.setBillingContactPerson(blankToNull(in.billingContactPerson()));
        String ssn = blankToNull(in.ssn());
        if (ssn != null) p.setSsnEnc(cryptoService.encrypt(ssn.replaceAll("\\D", "")));
        String pecos = blankToNull(in.pecosPassword());
        if (pecos != null) p.setPecosPasswordEnc(cryptoService.encrypt(pecos));
    }

    public ProviderExtraView view(Provider p) {
        String last4 = null;
        if (p.getSsnEnc() != null) {
            try {
                String ssn = cryptoService.decrypt(p.getSsnEnc());
                last4 = ssn.length() >= 4 ? ssn.substring(ssn.length() - 4) : null;
            } catch (RuntimeException ignored) {
                // a value that can't be read is shown as stored, without digits
            }
        }
        return new ProviderExtraView(p.getTaxonomyCode(), p.getGroupName(), p.getGroupNpi(), p.getTaxId(), p.getHomeAddress(), p.getHomeCity(), p.getHomeState(), p.getHomeZip(), p.getMedicarePhone(), p.getMedicaidNumber(), p.getMedicarePtan(), p.getDrivingLicense(), p.getPracticeLegalName(), p.getPracticeDbaName(), p.getPracticeOwnerName(), p.getPracticeManagerName(), p.getPracticeManagerContact(), p.getPracticeAddress(), p.getPracticeCity(), p.getPracticeState(), p.getPracticeZip(), p.getPracticePhone(), p.getPracticeFax(), p.getPracticeEmail(), p.getPracticeStartDate(), p.getOfficeHours(), p.getBillingAddress(), p.getBillingCity(), p.getBillingState(), p.getBillingZip(), p.getBillingPhone(), p.getBillingFax(), p.getBillingEmail(), p.getBillingContactPerson(),
                p.getSsnEnc() != null, last4, p.getPecosPasswordEnc() != null);
    }

    private static String nz(String v) {
        return v == null ? "" : v;
    }

    private static String upper(String v) {
        String s = blankToNull(v);
        return s == null ? null : s.toUpperCase();
    }

    private static String lower(String v) {
        String s = blankToNull(v);
        return s == null ? null : s.toLowerCase();
    }
}
