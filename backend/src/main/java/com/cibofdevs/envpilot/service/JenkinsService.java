package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.Project;
import com.cibofdevs.envpilot.model.Environment;
import com.cibofdevs.envpilot.model.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

@Service
public class JenkinsService {

    @Autowired
    private RestTemplate restTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Trigger Jenkins job with parameters
     */
    public Map<String, Object> triggerJenkinsJob(Project project, Environment environment, String version, String notes, String envName, User triggeredBy) {
        Map<String, Object> result = new HashMap<>();

        try {
            // Validate Jenkins configuration
            if (!isJenkinsConfigured(project)) {
                result.put("success", false);
                result.put("message", "Jenkins configuration is incomplete for this project");
                return result;
            }

            // Prepare Jenkins URL
            String jenkinsUrl = project.getJenkinsUrl();
            if (!jenkinsUrl.endsWith("/")) {
                jenkinsUrl += "/";
            }
            String buildUrl = jenkinsUrl + "job/" + project.getJenkinsJobName() + "/buildWithParameters";
            String crumbUrl = jenkinsUrl + "crumbIssuer/api/json";

            // Prepare headers with Basic Auth
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            String auth = project.getJenkinsUsername() + ":" + project.getJenkinsToken();
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
            headers.set("Authorization", "Basic " + encodedAuth);

            // Ambil crumb dari Jenkins
            String crumbField = null;
            String crumbValue = null;
            try {
                HttpEntity<String> crumbRequest = new HttpEntity<>(headers);
                ResponseEntity<String> crumbResponse = restTemplate.exchange(crumbUrl, HttpMethod.GET, crumbRequest, String.class);
                if (crumbResponse.getStatusCode().is2xxSuccessful()) {
                    JsonNode crumbJson = objectMapper.readTree(crumbResponse.getBody());
                    crumbField = crumbJson.get("crumbRequestField").asText();
                    crumbValue = crumbJson.get("crumb").asText();
                    headers.set(crumbField, crumbValue);
                } else {
                    result.put("success", false);
                    result.put("message", "Failed to get Jenkins crumb. Status: " + crumbResponse.getStatusCode());
                    return result;
                }
            } catch (Exception e) {
                result.put("success", false);
                result.put("message", "Failed to get Jenkins crumb: " + e.getMessage());
                return result;
            }

            // Prepare parameters
            MultiValueMap<String, String> parameters = new LinkedMultiValueMap<>();
            String envToSend = (envName != null && !envName.isEmpty()) ? envName : environment.getName();
            parameters.add("ENV", envToSend);
            parameters.add("VERSION", version != null ? version : "latest");
            parameters.add("PROJECT_ID", project.getId().toString());
            parameters.add("PROJECT_NAME", project.getName());
            parameters.add("TRIGGERED_BY_USER_ID", triggeredBy.getId().toString());
            parameters.add("TRIGGERED_BY_USER_NAME", triggeredBy.getName());
            parameters.add("TRIGGERED_BY_USER_EMAIL", triggeredBy.getEmail());
            if (notes != null && !notes.trim().isEmpty()) {
                parameters.add("NOTES", notes);
            }

            HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(parameters, headers);

            // Make the request
            ResponseEntity<String> response = restTemplate.postForEntity(buildUrl, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                result.put("success", true);
                result.put("message", "Jenkins job triggered successfully");
                result.put("buildUrl", buildUrl);

                // Extract build number from Location header if available
                String location = response.getHeaders().getFirst("Location");
                if (location != null) {
                    result.put("buildLocation", location);
                    
                    // Try to extract build number from location URL
                    try {
                        String[] locationParts = location.split("/");
                        for (int i = locationParts.length - 1; i >= 0; i--) {
                            if (locationParts[i].matches("\\d+")) {
                                int buildNum = Integer.parseInt(locationParts[i]);
                                result.put("buildNumber", buildNum);
                                break;
                            }
                        }
                    } catch (Exception e) {
                        // If we can't parse build number, continue without it
                        System.out.println("Could not extract build number from location: " + location);
                    }
                }
                
                // If we couldn't get build number from location, try to get it from the last build
                if (!result.containsKey("buildNumber")) {
                    try {
                        Thread.sleep(2000); // Wait a bit for Jenkins to process the build
                        Map<String, Object> lastBuild = getLastBuildStatus(project);
                        if ((Boolean) lastBuild.get("success")) {
                            result.put("buildNumber", lastBuild.get("buildNumber"));
                        }
                    } catch (Exception e) {
                        System.out.println("Could not get build number from last build: " + e.getMessage());
                    }
                }
            } else {
                result.put("success", false);
                result.put("message", "Failed to trigger Jenkins job. Status: " + response.getStatusCode());
            }

        } catch (HttpClientErrorException e) {
            result.put("success", false);
            result.put("message", "Jenkins API error: " + e.getMessage());
            result.put("statusCode", e.getStatusCode().value());
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error triggering Jenkins job: " + e.getMessage());
        }

        return result;
    }

    /**
     * Get last build status from Jenkins
     */
    public Map<String, Object> getLastBuildStatus(Project project) {
        Map<String, Object> result = new HashMap<>();

        try {
            if (!isJenkinsConfigured(project)) {
                result.put("success", false);
                result.put("message", "Jenkins configuration is incomplete");
                return result;
            }

            String jenkinsUrl = project.getJenkinsUrl();
            if (!jenkinsUrl.endsWith("/")) {
                jenkinsUrl += "/";
            }
            String buildStatusUrl = jenkinsUrl + "job/" + project.getJenkinsJobName() + "/lastBuild/api/json";

            // Prepare headers with Basic Auth
            HttpHeaders headers = new HttpHeaders();
            String auth = project.getJenkinsUsername() + ":" + project.getJenkinsToken();
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
            headers.set("Authorization", "Basic " + encodedAuth);

            HttpEntity<String> request = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(buildStatusUrl, HttpMethod.GET, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode buildInfo = objectMapper.readTree(response.getBody());

                result.put("success", true);
                result.put("buildNumber", buildInfo.get("number").asInt());
                result.put("result", buildInfo.has("result") ? buildInfo.get("result").asText() : "IN_PROGRESS");
                result.put("building", buildInfo.get("building").asBoolean());
                result.put("timestamp", buildInfo.get("timestamp").asLong());
                result.put("duration", buildInfo.get("duration").asLong());
                result.put("url", buildInfo.get("url").asText());

                if (buildInfo.has("description") && !buildInfo.get("description").isNull()) {
                    result.put("description", buildInfo.get("description").asText());
                }
            } else {
                result.put("success", false);
                result.put("message", "Failed to get build status. Status: " + response.getStatusCode());
            }

        } catch (HttpClientErrorException e) {
            result.put("success", false);
            if (e.getStatusCode().value() == 404) {
                result.put("message", "Job not found. Please check Jenkins job configuration.");
            } else if (e.getStatusCode().value() == 401) {
                result.put("message", "Authentication failed. Please check Jenkins credentials.");
            } else if (e.getStatusCode().value() == 403) {
                result.put("message", "Access denied. Please check Jenkins permissions.");
            } else {
                result.put("message", "Jenkins API error: " + e.getMessage());
            }
            result.put("statusCode", e.getStatusCode().value());
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error getting build status: " + e.getMessage());
        }

        return result;
    }

    /**
     * Test Jenkins connection
     */
    public Map<String, Object> testJenkinsConnection(Project project) {
        Map<String, Object> result = new HashMap<>();

        try {
            if (!isJenkinsConfigured(project)) {
                result.put("success", false);
                result.put("message", "Jenkins configuration is incomplete");
                return result;
            }

            String jenkinsUrl = project.getJenkinsUrl();
            if (!jenkinsUrl.endsWith("/")) {
                jenkinsUrl += "/";
            }
            String testUrl = jenkinsUrl + "job/" + project.getJenkinsJobName() + "/api/json";

            // Prepare headers with Basic Auth
            HttpHeaders headers = new HttpHeaders();
            String auth = project.getJenkinsUsername() + ":" + project.getJenkinsToken();
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
            headers.set("Authorization", "Basic " + encodedAuth);

            HttpEntity<String> request = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(testUrl, HttpMethod.GET, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode jobInfo = objectMapper.readTree(response.getBody());
                result.put("success", true);
                result.put("message", "Jenkins connection successful");
                result.put("jobName", jobInfo.get("name").asText());
                result.put("jobUrl", jobInfo.get("url").asText());
            } else {
                result.put("success", false);
                result.put("message", "Failed to connect to Jenkins. Status: " + response.getStatusCode());
            }

        } catch (HttpClientErrorException e) {
            result.put("success", false);
            result.put("message", "Jenkins connection failed: " + e.getMessage());
            result.put("statusCode", e.getStatusCode().value());
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error testing Jenkins connection: " + e.getMessage());
        }

        return result;
    }

    /**
     * Get build logs from Jenkins
     */
    public Map<String, Object> getBuildLogs(Project project, Integer buildNumber) {
        Map<String, Object> result = new HashMap<>();

        try {
            if (!isJenkinsConfigured(project)) {
                result.put("success", false);
                result.put("message", "Jenkins configuration is incomplete");
                return result;
            }

            String jenkinsUrl = project.getJenkinsUrl();
            if (!jenkinsUrl.endsWith("/")) {
                jenkinsUrl += "/";
            }
            
            // If buildNumber is null, get the last build
            String buildLogsUrl;
            if (buildNumber != null) {
                buildLogsUrl = jenkinsUrl + "job/" + project.getJenkinsJobName() + "/" + buildNumber + "/consoleText";
            } else {
                buildLogsUrl = jenkinsUrl + "job/" + project.getJenkinsJobName() + "/lastBuild/consoleText";
            }

            // Prepare headers with Basic Auth
            HttpHeaders headers = new HttpHeaders();
            String auth = project.getJenkinsUsername() + ":" + project.getJenkinsToken();
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
            headers.set("Authorization", "Basic " + encodedAuth);

            HttpEntity<String> request = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(buildLogsUrl, HttpMethod.GET, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                result.put("success", true);
                result.put("logs", response.getBody());
                result.put("buildNumber", buildNumber);
            } else {
                result.put("success", false);
                result.put("message", "Failed to get build logs. Status: " + response.getStatusCode());
            }

        } catch (HttpClientErrorException e) {
            result.put("success", false);
            if (e.getStatusCode().value() == 404) {
                result.put("message", "Build not found. The specified build number may not exist.");
            } else if (e.getStatusCode().value() == 401) {
                result.put("message", "Authentication failed. Please check Jenkins credentials.");
            } else if (e.getStatusCode().value() == 403) {
                result.put("message", "Access denied. Please check Jenkins permissions.");
            } else {
                result.put("message", "Jenkins API error: " + e.getMessage());
            }
            result.put("statusCode", e.getStatusCode().value());
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error getting build logs: " + e.getMessage());
        }

        return result;
    }

    /**
     * Get recent builds from Jenkins
     */
    public Map<String, Object> getRecentBuilds(Project project, Integer limit) {
        Map<String, Object> result = new HashMap<>();

        try {
            if (!isJenkinsConfigured(project)) {
                result.put("success", false);
                result.put("message", "Jenkins configuration is incomplete");
                return result;
            }

            String jenkinsUrl = project.getJenkinsUrl();
            if (!jenkinsUrl.endsWith("/")) {
                jenkinsUrl += "/";
            }
            String buildsUrl = jenkinsUrl + "job/" + project.getJenkinsJobName() + "/api/json?tree=builds[number,result,building,timestamp,duration,url,description,actions[parameters[name,value]]]";

            // Prepare headers with Basic Auth
            HttpHeaders headers = new HttpHeaders();
            String auth = project.getJenkinsUsername() + ":" + project.getJenkinsToken();
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
            headers.set("Authorization", "Basic " + encodedAuth);

            HttpEntity<String> request = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(buildsUrl, HttpMethod.GET, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode jobInfo = objectMapper.readTree(response.getBody());
                JsonNode builds = jobInfo.get("builds");
                
                // Convert JsonNode to List<Map<String, Object>> and limit the number of builds if needed
                if (builds != null && builds.isArray()) {
                    List<Map<String, Object>> buildsList = new ArrayList<>();
                    int maxBuilds = limit != null && limit > 0 ? Math.min(limit, builds.size()) : builds.size();
                    
                    for (int i = 0; i < maxBuilds; i++) {
                        JsonNode buildNode = builds.get(i);
                        Map<String, Object> buildMap = new HashMap<>();
                        
                        if (buildNode.has("number")) buildMap.put("number", buildNode.get("number").asInt());
                        if (buildNode.has("result")) buildMap.put("result", buildNode.get("result").asText());
                        if (buildNode.has("building")) buildMap.put("building", buildNode.get("building").asBoolean());
                        if (buildNode.has("timestamp")) buildMap.put("timestamp", buildNode.get("timestamp").asLong());
                        if (buildNode.has("duration")) buildMap.put("duration", buildNode.get("duration").asLong());
                        if (buildNode.has("url")) buildMap.put("url", buildNode.get("url").asText());
                        if (buildNode.has("description")) buildMap.put("description", buildNode.get("description").asText());
                        
                        // Extract user information from build parameters
                        if (buildNode.has("actions")) {
                            JsonNode actions = buildNode.get("actions");
                            for (JsonNode action : actions) {
                                if (action.has("parameters")) {
                                    JsonNode parameters = action.get("parameters");
                                    for (JsonNode param : parameters) {
                                        String paramName = param.get("name").asText();
                                        String paramValue = param.get("value").asText();
                                        
                                        if ("TRIGGERED_BY_USER_ID".equals(paramName)) {
                                            buildMap.put("triggeredByUserId", paramValue);
                                        } else if ("TRIGGERED_BY_USER_NAME".equals(paramName)) {
                                            buildMap.put("triggeredByUserName", paramValue);
                                        } else if ("TRIGGERED_BY_USER_EMAIL".equals(paramName)) {
                                            buildMap.put("triggeredByUserEmail", paramValue);
                                        }
                                    }
                                }
                            }
                        }
                        
                        buildsList.add(buildMap);
                    }
                    
                    result.put("builds", buildsList);
                } else {
                    result.put("builds", new ArrayList<>());
                }
                
                result.put("success", true);
            } else {
                result.put("success", false);
                result.put("message", "Failed to get recent builds. Status: " + response.getStatusCode());
            }

        } catch (HttpClientErrorException e) {
            result.put("success", false);
            result.put("message", "Jenkins API error: " + e.getMessage());
            result.put("statusCode", e.getStatusCode().value());
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error getting recent builds: " + e.getMessage());
        }

        return result;
    }

    /**
     * Check if Jenkins is properly configured for a project
     */
    private boolean isJenkinsConfigured(Project project) {
        return project.getJenkinsUrl() != null && !project.getJenkinsUrl().trim().isEmpty() &&
               project.getJenkinsJobName() != null && !project.getJenkinsJobName().trim().isEmpty() &&
               project.getJenkinsUsername() != null && !project.getJenkinsUsername().trim().isEmpty() &&
               project.getJenkinsToken() != null && !project.getJenkinsToken().trim().isEmpty();
    }
}
