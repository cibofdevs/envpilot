package com.cibofdevs.envpilot.event;

import com.cibofdevs.envpilot.model.DeploymentHistory;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class DeploymentStatusEvent extends ApplicationEvent {
    
    private final DeploymentHistory deployment;
    private final String oldStatus;
    private final String newStatus;
    
    public DeploymentStatusEvent(Object source, DeploymentHistory deployment, String oldStatus, String newStatus) {
        super(source);
        this.deployment = deployment;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
    }
} 