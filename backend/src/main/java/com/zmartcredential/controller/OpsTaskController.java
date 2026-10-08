package com.zmartcredential.controller;

import com.zmartcredential.dto.task.OpsTaskDtos.TaskListResponse;
import com.zmartcredential.dto.task.OpsTaskDtos.TaskRequest;
import com.zmartcredential.dto.task.OpsTaskDtos.TaskRow;
import com.zmartcredential.dto.task.OpsTaskDtos.TaskStatusRequest;
import com.zmartcredential.service.OpsTaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Tasks")
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class OpsTaskController {

    private final OpsTaskService service;

    @Operation(summary = "List tasks with filters and tab counts")
    @GetMapping
    public TaskListResponse list(@RequestParam(required = false) String status,
                                 @RequestParam(required = false) String priority,
                                 @RequestParam(required = false) Long providerId,
                                 @RequestParam(required = false) Long assigneeId,
                                 @RequestParam(required = false) String q) {
        return service.list(status, priority, providerId, assigneeId, q);
    }

    @Operation(summary = "Create a task")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskRow create(@Valid @RequestBody TaskRequest req) {
        return service.create(req);
    }

    @Operation(summary = "Update a task's fields")
    @PutMapping("/{id}")
    public TaskRow update(@PathVariable Long id, @Valid @RequestBody TaskRequest req) {
        return service.update(id, req);
    }

    @Operation(summary = "Change a task's status")
    @PatchMapping("/{id}/status")
    public TaskRow status(@PathVariable Long id, @Valid @RequestBody TaskStatusRequest req) {
        return service.updateStatus(id, req.status());
    }

    @Operation(summary = "Delete a task")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
