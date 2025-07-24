package com.cibofdevs.envpilot.controller;

import com.cibofdevs.envpilot.model.Notification;
import com.cibofdevs.envpilot.model.User;
import com.cibofdevs.envpilot.repository.NotificationRepository;
import com.cibofdevs.envpilot.repository.UserRepository;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@Tag(name = "Notifications", description = "Notification management APIs")
@SecurityRequirement(name = "Bearer Authentication")
public class NotificationController {
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private UserRepository userRepository;

    private User getCurrentUser(Authentication authentication) {
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElse(null);
    }

    @GetMapping
    @Operation(
        summary = "Get User Notifications",
        description = "Retrieve all notifications for the authenticated user."
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Notifications retrieved successfully",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = Notification.class)
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Unauthorized - Authentication required"
        )
    })
    public ResponseEntity<List<Notification>> getNotifications(Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(notificationRepository.findByUserIdOrderByTimeDesc(user.getId()));
    }

    @GetMapping("/unread-count")
    @Operation(
        summary = "Get Unread Notifications Count",
        description = "Get count of unread notifications for the authenticated user."
    )
    public ResponseEntity<Map<String, Object>> getUnreadCount(Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(401).build();
        
        long unreadCount = notificationRepository.countByUserIdAndReadFalse(user.getId());
        Map<String, Object> response = new HashMap<>();
        response.put("unreadCount", unreadCount);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping
    @Transactional
    public ResponseEntity<?> clearNotifications(Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(401).build();
        notificationRepository.deleteByUserId(user.getId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{notificationId}/read")
    @Transactional
    public ResponseEntity<?> markNotificationAsRead(@PathVariable Long notificationId, Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(401).build();
        
        Optional<Notification> notificationOpt = notificationRepository.findById(notificationId);
        if (notificationOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Notification notification = notificationOpt.get();
        if (!notification.getUser().getId().equals(user.getId())) {
            return ResponseEntity.status(403).build();
        }
        
        notification.setRead(true);
        notificationRepository.save(notification);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/read-all")
    @Transactional
    public ResponseEntity<?> markAllNotificationsAsRead(Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(401).build();
        
        List<Notification> userNotifications = notificationRepository.findByUserId(user.getId());
        for (Notification notification : userNotifications) {
            notification.setRead(true);
        }
        notificationRepository.saveAll(userNotifications);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{notificationId}")
    @Transactional
    public ResponseEntity<?> deleteNotification(
            @PathVariable Long notificationId,
            Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (user == null) return ResponseEntity.status(401).build();
        
        // Check if notification belongs to current user
        List<Notification> userNotifications = notificationRepository.findByUserId(user.getId());
        boolean notificationExists = userNotifications.stream()
            .anyMatch(notification -> notification.getId().equals(notificationId));
        
        if (!notificationExists) {
            return ResponseEntity.notFound().build();
        }
        
        notificationRepository.deleteById(notificationId);
        return ResponseEntity.ok().build();
    }
} 