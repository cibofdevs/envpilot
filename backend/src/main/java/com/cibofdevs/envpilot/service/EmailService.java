package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.DeploymentHistory;
import com.cibofdevs.envpilot.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.internet.MimeMessage;
import org.springframework.stereotype.Service;
import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${spring.mail.properties.mail.smtp.auth}")
    private boolean smtpAuth;

    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm:ss");

    /**
     * Send deployment success notification email
     */
    public void sendDeploymentSuccessEmail(User user, DeploymentHistory deployment) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject("[EnvPilot] Deployment Successful: " + deployment.getProject().getName());
            
            String buildNumberText = deployment.getJenkinsBuildNumber() != null ? 
                " (Build #" + deployment.getJenkinsBuildNumber() + ")" : "";
            
            String htmlContent = generateSuccessEmailHtml(
                user.getName(),
                deployment.getProject().getName(),
                deployment.getEnvironment().getName(),
                deployment.getVersion() + buildNumberText,
                deployment.getTriggeredBy().getName(),
                deployment.getCompletedAt() != null ? 
                    deployment.getCompletedAt().format(TIME_FORMATTER) : "N/A"
            );
            
            // Set content type explicitly
            message.setContent(htmlContent, "text/html; charset=UTF-8");
            
            mailSender.send(message);
            
            System.out.println("📧 Email notification sent successfully");
            System.out.println("   To: " + user.getEmail());
            System.out.println("   Subject: Deployment Successful - " + deployment.getProject().getName());
            System.out.println("   Content-Type: HTML");
            System.out.println("   From: " + fromEmail);
            System.out.println("   SMTP Auth: " + smtpAuth);
            System.out.println("   Deployment ID: " + deployment.getId());
            System.out.println("   Project: " + deployment.getProject().getName());
            System.out.println("   Environment: " + deployment.getEnvironment().getName());
            System.out.println("   Version: " + deployment.getVersion());
            System.out.println("   Build Number: " + deployment.getJenkinsBuildNumber());
            
        } catch (Exception e) {
            System.err.println("❌ Failed to send deployment success email: " + e.getMessage());
            e.printStackTrace();
            // Don't crash the application if email sending fails
        }
    }

    /**
     * Send deployment failure notification email
     */
    public void sendDeploymentFailureEmail(User user, DeploymentHistory deployment) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(user.getEmail());
            helper.setSubject("[EnvPilot] Deployment Failed: " + deployment.getProject().getName());
            
            String buildNumberText = deployment.getJenkinsBuildNumber() != null ? 
                " (Build #" + deployment.getJenkinsBuildNumber() + ")" : "";
            
            String htmlContent = generateFailureEmailHtml(
                user.getName(),
                deployment.getProject().getName(),
                deployment.getEnvironment().getName(),
                deployment.getVersion() + buildNumberText,
                deployment.getTriggeredBy().getName(),
                deployment.getCompletedAt() != null ? 
                    deployment.getCompletedAt().format(TIME_FORMATTER) : "N/A"
            );
            
            // Set content type explicitly
            message.setContent(htmlContent, "text/html; charset=UTF-8");
            mailSender.send(message);
            
            System.out.println("📧 Email notification sent successfully");
            System.out.println("   To: " + user.getEmail());
            System.out.println("   Subject: Deployment Failed - " + deployment.getProject().getName());
            System.out.println("   Content-Type: HTML");
            System.out.println("   From: " + fromEmail);
            System.out.println("   SMTP Auth: " + smtpAuth);
            System.out.println("   Deployment ID: " + deployment.getId());
            System.out.println("   Project: " + deployment.getProject().getName());
            System.out.println("   Environment: " + deployment.getEnvironment().getName());
            System.out.println("   Version: " + deployment.getVersion());
            System.out.println("   Build Number: " + deployment.getJenkinsBuildNumber());
            
        } catch (Exception e) {
            System.err.println("❌ Failed to send deployment failure email: " + e.getMessage());
            // Don't crash the application if email sending fails
        }
    }

    /**
     * Generate HTML email template for successful deployment
     */
    private String generateSuccessEmailHtml(String userName, String projectName, String environmentName, 
                                          String version, String triggeredBy, String completedAt) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html lang=\"en\">");
        html.append("<head>");
        html.append("<meta charset=\"UTF-8\">");
        html.append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
        html.append("<title>[EnvPilot] Deployment Successful: ").append(projectName).append("</title>");
        html.append("<style>");
        html.append("* { margin: 0; padding: 0; box-sizing: border-box; }");
        html.append("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8fafc; padding: 20px; }");
        html.append(".container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }");
        html.append(".banner { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 12px 12px 0 0; }");
        html.append(".banner h1 { font-size: 24px; font-weight: 700; margin: 0; }");
        html.append(".content { padding: 30px; }");
        html.append(".greeting { font-size: 16px; font-weight: 600; margin-bottom: 20px; color: #2d3748; }");
        html.append(".message { font-size: 16px; color: #4a5568; margin-bottom: 25px; line-height: 1.6; }");
        html.append(".details-section { margin: 25px 0; background: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; }");
        html.append(".details-table { width: 100%; border-collapse: collapse; }");
        html.append(".details-table tr { border-bottom: 1px solid #e2e8f0; }");
        html.append(".details-table tr:last-child { border-bottom: none; }");
        html.append(".details-table td { padding: 12px 8px; vertical-align: top; }");
        html.append(".details-table td:first-child { width: 30%; font-weight: 600; color: #4a5568; font-size: 14px; }");
        html.append(".details-table td:last-child { width: 70%; font-weight: 600; color: #2d3748; font-size: 14px; word-break: break-word; }");
        html.append(".status-badge { background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }");
        html.append(".notes-section { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }");
        html.append(".notes-label { font-weight: 600; color: #92400e; font-size: 14px; margin-bottom: 5px; }");
        html.append(".notes-content { color: #92400e; font-size: 14px; }");
        html.append(".footer { background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0; }");
        html.append(".footer-brand { font-size: 18px; font-weight: 700; color: #2d3748; margin-bottom: 5px; }");
        html.append(".footer-tagline { font-size: 14px; color: #718096; margin-bottom: 5px; }");
        html.append(".footer-thanks { font-size: 14px; color: #718096; }");
        html.append("@media (max-width: 768px) { .details-table { display: block; } .details-table tbody { display: block; } .details-table tr { display: block; margin-bottom: 15px; border-bottom: none; } .details-table td { display: block; width: 100%; padding: 8px 0; } .details-table td:first-child { border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px; } .details-table td:last-child { padding-top: 4px; } }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        html.append("<div class=\"container\">");
        html.append("<div class=\"banner\">");
        html.append("<h1>Deployment Successful</h1>");
        html.append("</div>");
        html.append("<div class=\"content\">");
        html.append("<div class=\"greeting\">Hello ").append(userName).append(",</div>");
        html.append("<div class=\"message\">Great news! Your deployment has been completed successfully. The application is now live and ready for use.</div>");
        html.append("<div class=\"details-section\">");
        html.append("<table class=\"details-table\">");
        html.append("<tbody>");
        html.append("<tr>");
        html.append("<td>Project:</td>");
        html.append("<td>").append(projectName).append("</td>");
        html.append("</tr>");
        html.append("<tr>");
        html.append("<td>Environment:</td>");
        html.append("<td>").append(environmentName).append("</td>");
        html.append("</tr>");
        html.append("<tr>");
        html.append("<td>Version:</td>");
        html.append("<td>").append(version).append("</td>");
        html.append("</tr>");
        html.append("<tr>");
        html.append("<td>Status:</td>");
        html.append("<td><span class=\"status-badge\">Success</span></td>");
        html.append("</tr>");
        html.append("<tr>");
        html.append("<td>Completed At:</td>");
        html.append("<td>").append(completedAt).append("</td>");
        html.append("</tr>");
        html.append("</tbody>");
        html.append("</table>");
        html.append("</div>");
        html.append("<div class=\"notes-section\">");
        html.append("<div class=\"notes-label\">Deployment Notes:</div>");
        html.append("<div class=\"notes-content\">Quick deploy to ").append(environmentName).append("</div>");
        html.append("</div>");
        html.append("</div>");
        html.append("<div class=\"footer\">");
        html.append("<div class=\"footer-brand\">EnvPilot</div>");
        html.append("<div class=\"footer-tagline\">Multi-Project Environment Manager</div>");
        html.append("<div class=\"footer-thanks\">Thank you for using our platform</div>");
        html.append("</div>");
        html.append("</div>");
        html.append("</body>");
        html.append("</html>");
        
        return html.toString();
    }

    /**
     * Generate HTML email template for failed deployment
     */
    private String generateFailureEmailHtml(String userName, String projectName, String environmentName, 
                                          String version, String triggeredBy, String failedAt) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>");
        html.append("<html lang=\"en\">");
        html.append("<head>");
        html.append("<meta charset=\"UTF-8\">");
        html.append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
        html.append("<title>[EnvPilot] Deployment Failed: ").append(projectName).append("</title>");
        html.append("<style>");
        html.append("* { margin: 0; padding: 0; box-sizing: border-box; }");
        html.append("body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8fafc; padding: 20px; }");
        html.append(".container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }");
        html.append(".banner { background: #e53e3e; color: white; padding: 20px; text-align: center; border-radius: 12px 12px 0 0; }");
        html.append(".banner h1 { font-size: 24px; font-weight: 700; margin: 0; }");
        html.append(".content { padding: 30px; }");
        html.append(".greeting { font-size: 16px; font-weight: 600; margin-bottom: 20px; color: #2d3748; }");
        html.append(".message { font-size: 16px; color: #c53030; margin-bottom: 25px; line-height: 1.6; font-weight: 600; }");
        html.append(".details-section { margin: 25px 0; background: #f8fafc; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0; }");
        html.append(".details-table { width: 100%; border-collapse: collapse; }");
        html.append(".details-table tr { border-bottom: 1px solid #e2e8f0; }");
        html.append(".details-table tr:last-child { border-bottom: none; }");
        html.append(".details-table td { padding: 12px 8px; vertical-align: top; }");
        html.append(".details-table td:first-child { width: 30%; font-weight: 600; color: #4a5568; font-size: 14px; }");
        html.append(".details-table td:last-child { width: 70%; font-weight: 600; color: #2d3748; font-size: 14px; word-break: break-word; }");
        html.append(".status-badge { background: #e53e3e; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; }");
        html.append(".notes-section { background: #fed7d7; border: 1px solid #fc8181; border-radius: 8px; padding: 15px; margin: 20px 0; }");
        html.append(".notes-label { font-weight: 600; color: #c53030; font-size: 14px; margin-bottom: 5px; }");
        html.append(".notes-content { color: #c53030; font-size: 14px; }");
        html.append(".footer { background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0; }");
        html.append(".footer-brand { font-size: 18px; font-weight: 700; color: #2d3748; margin-bottom: 5px; }");
        html.append(".footer-tagline { font-size: 14px; color: #718096; margin-bottom: 5px; }");
        html.append(".footer-thanks { font-size: 14px; color: #718096; }");
        html.append("@media (max-width: 768px) { .details-table { display: block; } .details-table tbody { display: block; } .details-table tr { display: block; margin-bottom: 15px; border-bottom: none; } .details-table td { display: block; width: 100%; padding: 8px 0; } .details-table td:first-child { border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 4px; } .details-table td:last-child { padding-top: 4px; } }");
        html.append("</style>");
        html.append("</head>");
        html.append("<body>");
        html.append("<div class=\"container\">");
        html.append("<div class=\"banner\">");
        html.append("<h1>Deployment Failed</h1>");
        html.append("</div>");
        html.append("<div class=\"content\">");
        html.append("<div class=\"greeting\">Hello ").append(userName).append(",</div>");
        html.append("<div class=\"message\">Unfortunately, your deployment has failed. Please check the details below and review the Jenkins build logs.</div>");
        html.append("<div class=\"details-section\">");
        html.append("<table class=\"details-table\">");
        html.append("<tbody>");
        html.append("<tr>");
        html.append("<td>Project:</td>");
        html.append("<td>").append(projectName).append("</td>");
        html.append("</tr>");
        html.append("<tr>");
        html.append("<td>Environment:</td>");
        html.append("<td>").append(environmentName).append("</td>");
        html.append("</tr>");
        html.append("<tr>");
        html.append("<td>Version:</td>");
        html.append("<td>").append(version).append("</td>");
        html.append("</tr>");
        html.append("<tr>");
        html.append("<td>Status:</td>");
        html.append("<td><span class=\"status-badge\">Failed</span></td>");
        html.append("</tr>");
        html.append("<tr>");
        html.append("<td>Failed At:</td>");
        html.append("<td>").append(failedAt).append("</td>");
        html.append("</tr>");
        html.append("<tr>");
        html.append("<td>Triggered By:</td>");
        html.append("<td>").append(triggeredBy).append("</td>");
        html.append("</tr>");
        html.append("</tbody>");
        html.append("</table>");
        html.append("</div>");
        html.append("<div class=\"notes-section\">");
        html.append("<div class=\"notes-label\">Deployment Notes:</div>");
        html.append("<div class=\"notes-content\">Please check the Jenkins build logs for more details about the failure.</div>");
        html.append("</div>");
        html.append("</div>");
        html.append("<div class=\"footer\">");
        html.append("<div class=\"footer-brand\">EnvPilot</div>");
        html.append("<div class=\"footer-tagline\">Multi-Project Environment Manager</div>");
        html.append("<div class=\"footer-thanks\">We're here to help you resolve deployment issues</div>");
        html.append("</div>");
        html.append("</div>");
        html.append("</body>");
        html.append("</html>");
        return html.toString();
    }
} 