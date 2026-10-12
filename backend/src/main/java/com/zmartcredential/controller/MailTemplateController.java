package com.zmartcredential.controller;

import com.zmartcredential.dto.email.MailTemplateDtos.MailTemplateItem;
import com.zmartcredential.dto.email.MailTemplateDtos.MailTemplateList;
import com.zmartcredential.dto.email.MailTemplateDtos.MailTemplateRequest;
import com.zmartcredential.service.MailTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Admin → Provider Link Templates / Enrollment Mail Templates. */
@Tag(name = "Mail templates")
@RestController
@RequestMapping("/api/mail-templates")
@RequiredArgsConstructor
public class MailTemplateController {

    private final MailTemplateService service;

    @Operation(summary = "Templates of a type (provider_link | enrollment_approved), with the one in use")
    @GetMapping
    public MailTemplateList list(@RequestParam String type) {
        return service.list(type);
    }

    @Operation(summary = "Add a template")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MailTemplateItem create(@Valid @RequestBody MailTemplateRequest req) {
        return service.create(req);
    }

    @Operation(summary = "Edit one of the organization's templates")
    @PutMapping("/{id}")
    public MailTemplateItem update(@PathVariable Long id, @Valid @RequestBody MailTemplateRequest req) {
        return service.update(id, req);
    }

    @Operation(summary = "Delete one of the organization's templates")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    @Operation(summary = "Use this template for the emails of its type")
    @PostMapping("/{id}/use")
    public MailTemplateItem use(@PathVariable Long id) {
        return service.use(id);
    }
}
