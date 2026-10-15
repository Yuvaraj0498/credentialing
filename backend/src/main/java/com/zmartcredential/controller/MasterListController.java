package com.zmartcredential.controller;

import com.zmartcredential.service.MasterListService;
import com.zmartcredential.service.MasterListService.ItemRequest;
import com.zmartcredential.service.MasterListService.ItemRow;
import com.zmartcredential.service.MasterListService.ListInfo;
import com.zmartcredential.service.MasterListService.Option;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Master Data: the lists behind the dropdowns. */
@Tag(name = "Master data")
@RestController
@RequiredArgsConstructor
public class MasterListController {

    private final MasterListService service;

    @Operation(summary = "The Master Data lists (tabs)")
    @GetMapping("/api/master-lists")
    public List<ListInfo> lists() {
        return service.lists();
    }

    @Operation(summary = "Dropdown options of a list (active items for the user's organization)")
    @GetMapping("/api/master-lists/{key}")
    public List<Option> options(@PathVariable String key) {
        return service.options(key);
    }

    @Operation(summary = "Master Data screen: every item of a list (super admin / organization admin)")
    @GetMapping("/api/master-lists/{key}/items")
    public List<ItemRow> items(@PathVariable String key) {
        return service.manage(key);
    }

    @PostMapping("/api/master-lists/{key}/items")
    @ResponseStatus(HttpStatus.CREATED)
    public ItemRow create(@PathVariable String key, @RequestBody ItemRequest req) {
        return service.create(key, req);
    }

    @PutMapping("/api/master-lists/{key}/items/{id}")
    public ItemRow update(@PathVariable String key, @PathVariable Long id, @RequestBody ItemRequest req) {
        return service.update(key, id, req);
    }

    @DeleteMapping("/api/master-lists/{key}/items/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String key, @PathVariable Long id) {
        service.delete(key, id);
    }

    @Operation(summary = "Public pages (sign-up, secure link): options of specialty / suffix / org_type")
    @GetMapping("/api/public/master-lists/{key}")
    public List<Option> publicOptions(@PathVariable String key, @RequestParam(required = false) String token) {
        return service.publicOptions(key, token);
    }
}
