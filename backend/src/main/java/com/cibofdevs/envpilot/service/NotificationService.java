package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.Notification;
import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class NotificationService {
    
    @Autowired
    private NotificationRepository notificationRepository;
    
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm");
    
    /**
     * Create a new notification for a user
     */
    public void createNotification(User user, String title, String description, String type) {
        Notification notification = new Notification();
        notification.setTitle(title);
        notification.setDescription(description);
        notification.setType(type);
        notification.setTime(LocalDateTime.now().format(TIME_FORMATTER));
        notification.setUser(user);

        notificationRepository.save(notification);
    }
}