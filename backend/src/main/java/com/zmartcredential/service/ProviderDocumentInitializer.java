package com.zmartcredential.service;

import com.zmartcredential.entity.DocumentType;
import com.zmartcredential.entity.Provider;
import com.zmartcredential.entity.ProviderDocument;
import com.zmartcredential.repository.DocumentTypeRepository;
import com.zmartcredential.repository.ProviderDocumentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/** Creates the document checklist rows for a new provider (prototype makeDocs: missing, or N/A where na_for_us). */
@Service
@RequiredArgsConstructor
public class ProviderDocumentInitializer {

    private final DocumentTypeRepository documentTypeRepository;
    private final ProviderDocumentRepository providerDocumentRepository;

    public void initialize(Provider provider) {
        List<ProviderDocument> docs = new ArrayList<>();
        for (DocumentType type : documentTypeRepository.findAllByOrderBySortOrderAsc()) {
            if (providerDocumentRepository.findByProviderIdAndDocType(provider.getId(), type.getCode()).isPresent()) {
                continue;
            }
            ProviderDocument d = new ProviderDocument();
            d.setOrgId(provider.getOrgId());
            d.setProviderId(provider.getId());
            d.setDocType(type.getCode());
            d.setStatus(Boolean.TRUE.equals(type.getNaForUs()) ? "na" : "missing");
            docs.add(d);
        }
        providerDocumentRepository.saveAll(docs);
    }
}
