package com.jobtrack.backend.controller;

import com.jobtrack.backend.entity.Application;
import com.jobtrack.backend.service.ApplicationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import java.util.List;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService applicationService;

    public ApplicationController(ApplicationService applicationService) {
        this.applicationService = applicationService;
    }

    @GetMapping
    public List<Application> getAllApplications() {
        return applicationService.getAllApplications();
    }

    @PostMapping
    public ResponseEntity<Application> createApplication(
            @Valid @RequestBody Application application) {

        Application createdApplication =
                applicationService.createApplication(application);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(createdApplication);
    }

    @GetMapping("/{id}")
    public Application getApplicationById(@PathVariable Long id) {
        return applicationService.getApplicationById(id);
    }

    @PutMapping("/{id}")
    public Application updateApplication(
            @PathVariable Long id,
            @Valid @RequestBody Application application) {

        return applicationService.updateApplication(id, application);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id) {

        applicationService.deleteApplication(id);

        return ResponseEntity.noContent().build();
    }
}