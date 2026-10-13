package com.zmartcredential.controller;

import com.zmartcredential.service.ProviderAdditionalDocumentService;
import com.zmartcredential.service.ProviderAdditionalDocumentService.AdditionalDocumentItem;
import com.zmartcredential.service.ProviderDocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.nio.charset.StandardCharsets;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** My Documents → Add More Document, and the provider's page (staff). */
@Tag(name = "Additional documents")
@RestController
@RequiredArgsConstructor
public class ProviderAdditionalDocumentController {

    private final ProviderAdditionalDocumentService service;

    @Operation(summary = "Extra documents of a provider")
    @GetMapping("/api/providers/{id:\\d+}/additional-documents")
    public List<AdditionalDocumentItem> list(@PathVariable Long id) {
        return service.list(id);
    }

    @Operation(summary = "Add an extra document (file + document type; title, expiresAt, notes optional)")
    @PostMapping(value = "/api/providers/{id:\\d+}/additional-documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AdditionalDocumentItem add(@PathVariable Long id, @RequestParam(value = "file", required = false) MultipartFile file,
                                      @RequestParam(value = "docType", required = false) String docType,
                                      @RequestParam(value = "title", required = false) String title,
                                      @RequestParam(value = "notes", required = false) String notes,
                                      @RequestParam(value = "expiresAt", required = false) String expiresAt) {
        return service.add(id, file, docType, title, notes, expiresAt);
    }

    @Operation(summary = "Download / view an extra document")
    @GetMapping("/api/additional-documents/{id:\\d+}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean inline) {
        ProviderDocumentService.DownloadedFile f = service.download(id);
        ContentDisposition cd = (inline ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(f.fileName(), StandardCharsets.UTF_8).build();
        MediaType type;
        try {
            type = f.mimeType() == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(f.mimeType());
        } catch (Exception e) {
            type = MediaType.APPLICATION_OCTET_STREAM;
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, cd.toString())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(type)
                .body(f.resource());
    }
}
