package com.jobtrack.backend.service;

import com.jobtrack.backend.entity.Application;
import com.jobtrack.backend.repository.ApplicationRepository;
import org.springframework.stereotype.Service;
import com.jobtrack.backend.exception.ApplicationNotFoundException;

import java.util.List;

@Service
public class ApplicationService {

    private final ApplicationRepository applicationRepository;

    public ApplicationService(ApplicationRepository applicationRepository) {
        this.applicationRepository = applicationRepository;
    }

    public List<Application> getAllApplications() {
        return applicationRepository.findAll();
    }

    public Application createApplication(Application application) {
        return applicationRepository.save(application);
    }

    public Application getApplicationById(Long id) {
        return applicationRepository.findById(id)
                .orElseThrow(() ->
                        new ApplicationNotFoundException(
                                "Application not found with id: " + id
                        )
                );
    }

    public Application updateApplication(Long id, Application updatedApplication) {

        Application existingApplication = applicationRepository.findById(id)
                .orElseThrow(() ->
                        new ApplicationNotFoundException(
                                "Application not found with id: " + id
                        )
                );

        existingApplication.setCompanyName(updatedApplication.getCompanyName());
        existingApplication.setPosition(updatedApplication.getPosition());
        existingApplication.setLocation(updatedApplication.getLocation());
        existingApplication.setJobType(updatedApplication.getJobType());
        existingApplication.setDateApplied(updatedApplication.getDateApplied());
        existingApplication.setStatus(updatedApplication.getStatus());
        existingApplication.setJobUrl(updatedApplication.getJobUrl());
        existingApplication.setNotes(updatedApplication.getNotes());

        return applicationRepository.save(existingApplication);
    }

    public void deleteApplication(Long id) {

        if (!applicationRepository.existsById(id)) {
            throw new ApplicationNotFoundException(
                    "Application not found with id: " + id
            );
        }

        applicationRepository.deleteById(id);
    }
}