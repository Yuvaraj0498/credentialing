package com.zmartcredential.controller;

import com.zmartcredential.dto.organization.LocationRequest;
import com.zmartcredential.dto.organization.LocationResponse;
import com.zmartcredential.dto.organization.OrgStructureDtos.DeleteResult;
import com.zmartcredential.service.OrgLocationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Locations")
@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class OrgLocationController {

    private final OrgLocationService service;

    @Operation(summary = "List locations with provider counts")
    @GetMapping
    public List<LocationResponse> list(@RequestParam(required = false) String q,
                                       @RequestParam(required = false) Boolean active,
                                       @RequestParam(required = false) Long practiceId) {
        return service.list(q, active, practiceId);
    }

    @Operation(summary = "Get location")
    @GetMapping("/{id}")
    public LocationResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @Operation(summary = "Create location")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LocationResponse create(@Valid @RequestBody LocationRequest req) {
        return service.create(req);
    }

    @Operation(summary = "Update location")
    @PutMapping("/{id}")
    public LocationResponse update(@PathVariable Long id, @Valid @RequestBody LocationRequest req) {
        return service.update(id, req);
    }

    @Operation(summary = "Delete location (assigned providers are unassigned)")
    @DeleteMapping("/{id}")
    public DeleteResult delete(@PathVariable Long id) {
        return service.delete(id);
    }
}
