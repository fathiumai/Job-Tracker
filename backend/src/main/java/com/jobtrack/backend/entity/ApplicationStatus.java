package com.jobtrack.backend.entity;

public enum ApplicationStatus {
    SAVED, //You found the job but haven't applied yet
    APPLIED, //Application submitted
    ASSESSMENT, //Coding/technical/other assessment stage
    INTERVIEW, //Interview stage
    REJECTED, //Application rejected
    OFFER, //You received an offer
    WITHDRAWN //You withdrew the application
}
