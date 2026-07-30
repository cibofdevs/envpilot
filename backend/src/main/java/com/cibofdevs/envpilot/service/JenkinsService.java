package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.Project;
import com.cibofdevs.envpilot.model.Environment;
import com.cibofdevs.envpilot.model.User;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

@Service
public class JenkinsService {

    @Autowired
    private RestTemplate restTemplate;

    @Autowired
    @Qualifier("jenkinsHealthCheckRestTemplate")
    private RestTemplate healthCheckRestTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Trigger Jenkins job with parameters
     */
    public Map<String, Object> triggerJenkinsJob(Project project, Environment environment, String version, String notes,
            String branch, String envName, Map<String, String> extraParameters, User triggeredBy) {
        Map<String, Object> result = new HashMap<>();

        try {
            System.out.println("🚀 Triggering Jenkins job for project: " + project.getName());
            System.out.println("   Project ID: " + project.getId());
            System.out.println("   Jenkins Job: " + project.getJenkinsJobName());
            System.out.println("   Environment: " + (environment != null ? environment.getName() : "N/A"));
            System.out.println("   Version: " + version);
            System.out.println("   Triggered By: " + triggeredBy.getName());
            
            // Validate Jenkins configuration
            if (!isJenkinsConfigured(project)) {
                result.put("success", false);
                result.put("message", "Jenkins configuration is incomplete for this project");
                return result;
            }

            // Prepare Jenkins URL. Jenkins rejects /buildWithParameters with a 400 ("is
            // not parameterized") for a job that declares no parameters at all, so use
            // plain /build for those - any parameters we'd otherwise send (including the
            // PROJECT_ID/TRIGGERED_BY_* bookkeeping fields) have nowhere to go on such a
            // job anyway, since Jenkins only maps them onto declared parameter names.
            String jenkinsUrl = project.getJenkinsUrl();
            if (!jenkinsUrl.endsWith("/")) {
                jenkinsUrl += "/";
            }
            boolean isParameterized = !fetchParameterDefinitions(project).isEmpty();
            String buildUrl = jenkinsUrl + "job/" + project.getJenkinsJobName()
                + (isParameterized ? "/buildWithParameters" : "/build");

            // Prepare headers with Basic Auth
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            String auth = project.getJenkinsUsername() + ":" + project.getJenkinsToken();
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
            headers.set("Authorization", "Basic " + encodedAuth);

            if (!addCrumb(project, headers)) {
                result.put("success", false);
                result.put("message", "Failed to get Jenkins crumb");
                return result;
            }

            // Prepare parameters. Dynamic parameters (whatever the job actually declares,
            // discovered live via getJobParameters) go first so a job's own parameter wins
            // if it happens to share a name with one of the fixed ones below; the EnvPilot
            // bookkeeping fields are stamped last, unconditionally, so they can never be
            // overridden by a same-named dynamic parameter. Skipped entirely for a
            // non-parameterized job - Jenkins has nowhere to map them since /build (unlike
            // /buildWithParameters) doesn't accept form parameters at all.
            MultiValueMap<String, String> parameters = new LinkedMultiValueMap<>();
            if (isParameterized) {
                if (extraParameters != null) {
                    for (Map.Entry<String, String> entry : extraParameters.entrySet()) {
                        if (entry.getKey() != null && entry.getValue() != null) {
                            parameters.add(entry.getKey(), entry.getValue());
                        }
                    }
                }
                String envToSend = (envName != null && !envName.isEmpty()) ? envName : (environment != null ? environment.getName() : null);
                if (envToSend != null && !envToSend.isEmpty() && !parameters.containsKey("ENV")) {
                    parameters.add("ENV", envToSend);
                }
                if (version != null && !version.trim().isEmpty() && !parameters.containsKey("VERSION")) {
                    parameters.add("VERSION", version);
                }
                if (notes != null && !notes.trim().isEmpty() && !parameters.containsKey("NOTES")) {
                    parameters.add("NOTES", notes);
                }
                if (branch != null && !branch.trim().isEmpty()) {
                    // The Jenkins job may declare its Git Parameter branch field under any name
                    // (the "pay-channel-non-sit" job uses "Branch"), so look up the real name
                    // rather than assuming one; fall back to "Branch" if it can't be discovered.
                    String branchParamName = findGitBranchParameterName(project);
                    parameters.set(branchParamName != null ? branchParamName : "Branch", branch);
                }
                parameters.set("PROJECT_ID", project.getId().toString());
                parameters.set("PROJECT_NAME", project.getName());
                parameters.set("TRIGGERED_BY_USER_ID", triggeredBy.getId().toString());
                parameters.set("TRIGGERED_BY_USER_NAME", triggeredBy.getName());
                parameters.set("TRIGGERED_BY_USER_EMAIL", triggeredBy.getEmail());
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
                    System.out.println("📍 Location header: " + location);
                    
                    // Try to extract build number from location URL
                    try {
                        String[] locationParts = location.split("/");
                        System.out.println("🔍 Location parts: " + String.join(", ", locationParts));
                        
                        for (int i = locationParts.length - 1; i >= 0; i--) {
                            String part = locationParts[i];
                            System.out.println("   Checking part " + i + ": '" + part + "'");
                            
                            if (part.matches("\\d+")) {
                                int buildNum = Integer.parseInt(part);
                                result.put("buildNumber", buildNum);
                                System.out.println("✅ Extracted build number from location: " + buildNum);
                                break;
                            }
                        }
                    } catch (Exception e) {
                        // If we can't parse build number, continue without it
                        System.out.println("❌ Could not extract build number from location: " + location);
                        System.out.println("   Error: " + e.getMessage());
                    }
                } else {
                    System.out.println("⚠️ No Location header found in response");
                }
                
                // Get build number from last build (since Location header is not available)
                try {
                    // Wait longer for Jenkins to process the build and get the correct build number
                    Thread.sleep(3000); // Increased wait time
                    
                    // Get the next build number by checking current last build and incrementing
                    Map<String, Object> currentLastBuild = getLastBuildStatus(project);
                    
                    if ((Boolean) currentLastBuild.get("success")) {
                        Integer currentBuildNumber = (Integer) currentLastBuild.get("buildNumber");
                        Integer nextBuildNumber = currentBuildNumber + 1;
                        result.put("buildNumber", nextBuildNumber);
                        System.out.println("✅ Next build number calculated: " + nextBuildNumber + " (current: " + currentBuildNumber + ")");
                    }
                } catch (Exception e) {
                    System.out.println("❌ Could not get build number: " + e.getMessage());
                }
                
                // Log build number for debugging (without strict validation)
                if (result.containsKey("buildNumber")) {
                    Integer buildNumber = (Integer) result.get("buildNumber");
                    System.out.println("✅ Final build number to be returned: " + buildNumber);
                } else {
                    System.out.println("⚠️ No build number available to return");
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

        // Log final result
        if ((Boolean) result.get("success")) {
            System.out.println("✅ Jenkins job triggered successfully");
            System.out.println("   Final build number: " + result.get("buildNumber"));
            System.out.println("   Build URL: " + result.get("buildUrl"));
        } else {
            System.out.println("❌ Jenkins job trigger failed: " + result.get("message"));
        }

        return result;
    }

    /**
     * Get last build status from Jenkins
     */
    public Map<String, Object> getLastBuildStatus(Project project) {
        Map<String, Object> result = new HashMap<>();

        try {
            System.out.println("🔍 Getting last build status for project: " + project.getName());
            System.out.println("   Project ID: " + project.getId());
            System.out.println("   Jenkins Job: " + project.getJenkinsJobName());
            
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
            
            System.out.println("   Jenkins URL: " + jenkinsUrl);
            System.out.println("   Build Status URL: " + buildStatusUrl);

            // Prepare headers with Basic Auth
            HttpHeaders headers = new HttpHeaders();
            String auth = project.getJenkinsUsername() + ":" + project.getJenkinsToken();
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
            headers.set("Authorization", "Basic " + encodedAuth);

            HttpEntity<String> request = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(buildStatusUrl, HttpMethod.GET, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                JsonNode buildInfo = objectMapper.readTree(response.getBody());
                
                int buildNumber = buildInfo.get("number").asInt();
                System.out.println("✅ Retrieved build number from Jenkins: " + buildNumber);
                System.out.println("   Build URL: " + buildInfo.get("url").asText());
                System.out.println("   Building: " + buildInfo.get("building").asBoolean());
                System.out.println("   Result: " + (buildInfo.has("result") ? buildInfo.get("result").asText() : "IN_PROGRESS"));

                result.put("success", true);
                result.put("buildNumber", buildNumber);
                result.put("result", buildInfo.has("result") ? buildInfo.get("result").asText() : "IN_PROGRESS");
                result.put("building", buildInfo.get("building").asBoolean());
                result.put("timestamp", buildInfo.get("timestamp").asLong());
                result.put("duration", buildInfo.get("duration").asLong());
                result.put("url", buildInfo.get("url").asText());

                if (buildInfo.has("description") && !buildInfo.get("description").isNull()) {
                    result.put("description", buildInfo.get("description").asText());
                }
            } else {
                System.out.println("❌ Failed to get build status. Status: " + response.getStatusCode());
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
        return testJenkinsConnection(project, restTemplate);
    }

    /**
     * Lightweight connectivity probe using a short-timeout RestTemplate, meant for
     * frequent monitoring/health-check callers (e.g. the analytics dashboard) that
     * must not be blocked for a long time by a slow or unreachable Jenkins instance.
     */
    public Map<String, Object> testJenkinsConnectionQuick(Project project) {
        return testJenkinsConnection(project, healthCheckRestTemplate);
    }

    private Map<String, Object> testJenkinsConnection(Project project, RestTemplate httpClient) {
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

            ResponseEntity<String> response = httpClient.exchange(testUrl, HttpMethod.GET, request, String.class);

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
            System.out.println("🔍 Jenkins API Error - Status: " + e.getStatusCode().value() + ", Message: " + e.getMessage());
            
            if (e.getStatusCode().value() == 404) {
                // Try to get available builds to provide better error message
                try {
                    System.out.println("🔍 Attempting to get available builds for project: " + project.getName());
                    Map<String, Object> availableBuilds = getAvailableBuildNumbers(project);
                    if ((Boolean) availableBuilds.get("success")) {
                        List<Integer> buildNumbers = (List<Integer>) availableBuilds.get("buildNumbers");
                        if (buildNumbers != null && !buildNumbers.isEmpty()) {
                            String availableBuildsStr = buildNumbers.stream().limit(10).map(String::valueOf).collect(Collectors.joining(", "));
                            result.put("message", String.format("Build #%d not found. Available builds: %s", buildNumber, availableBuildsStr));
                            System.out.println("✅ Available builds found: " + availableBuildsStr);
                        } else {
                            result.put("message", String.format("Build #%d not found. No builds available for this job.", buildNumber));
                            System.out.println("⚠️ No builds available for job: " + project.getJenkinsJobName());
                        }
                    } else {
                        result.put("message", String.format("Build #%d not found. The specified build number may not exist.", buildNumber));
                        System.out.println("❌ Failed to get available builds: " + availableBuilds.get("message"));
                    }
                } catch (Exception ex) {
                    result.put("message", String.format("Build #%d not found. The specified build number may not exist.", buildNumber));
                    System.out.println("❌ Exception while getting available builds: " + ex.getMessage());
                }
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
            System.out.println("❌ Unexpected error in getBuildLogs: " + e.getMessage());
            e.printStackTrace();
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
     * Get available build numbers for a project
     */
    private Map<String, Object> getAvailableBuildNumbers(Project project) {
        Map<String, Object> result = new HashMap<>();

        try {
            System.out.println("🔍 Getting available builds for project: " + project.getName());
            
            if (!isJenkinsConfigured(project)) {
                result.put("success", false);
                result.put("message", "Jenkins configuration is incomplete");
                System.out.println("❌ Jenkins configuration incomplete for project: " + project.getName());
                return result;
            }

            String jenkinsUrl = project.getJenkinsUrl();
            if (!jenkinsUrl.endsWith("/")) {
                jenkinsUrl += "/";
            }
            String buildsUrl = jenkinsUrl + "job/" + project.getJenkinsJobName() + "/api/json?tree=builds[number]";
            System.out.println("🔍 Jenkins URL: " + buildsUrl);

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
                
                if (builds != null && builds.isArray()) {
                    List<Integer> buildNumbers = new ArrayList<>();
                    for (JsonNode build : builds) {
                        if (build.has("number")) {
                            buildNumbers.add(build.get("number").asInt());
                        }
                    }
                    result.put("success", true);
                    result.put("buildNumbers", buildNumbers);
                    System.out.println("✅ Found " + buildNumbers.size() + " builds: " + buildNumbers);
                } else {
                    result.put("success", true);
                    result.put("buildNumbers", new ArrayList<>());
                    System.out.println("⚠️ No builds array found in response");
                }
            } else {
                result.put("success", false);
                result.put("message", "Failed to get build numbers. Status: " + response.getStatusCode());
                System.out.println("❌ Failed to get build numbers. Status: " + response.getStatusCode());
            }

        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "Error getting build numbers: " + e.getMessage());
            System.out.println("❌ Exception in getAvailableBuildNumbers: " + e.getMessage());
            e.printStackTrace();
        }

        return result;
    }

    /**
     * Get available branches for the job's Git Parameter field (Git Parameter plugin), if any.
     * Returns success=true with an empty branch list when the job has no such parameter,
     * so callers can treat "no branch field" and "no branches found" the same way.
     */
    public Map<String, Object> getGitBranches(Project project) {
        Map<String, Object> result = new HashMap<>();

        try {
            if (!isJenkinsConfigured(project)) {
                result.put("success", false);
                result.put("message", "Jenkins configuration is incomplete");
                return result;
            }

            String paramName = findGitBranchParameterName(project);
            if (paramName == null) {
                result.put("success", true);
                result.put("branchParameterName", null);
                result.put("branches", new ArrayList<String>());
                return result;
            }

            String jenkinsUrl = normalizeJenkinsUrl(project.getJenkinsUrl());
            String fillUrl = jenkinsUrl + "job/" + project.getJenkinsJobName()
                + "/descriptorByName/net.uaznia.lukanus.hudson.plugins.gitparameter.GitParameterDefinition/fillValueItems?param="
                + java.net.URLEncoder.encode(paramName, StandardCharsets.UTF_8);
            System.out.println("🔍 Fetching branch choices: " + fillUrl);

            // The Git Parameter plugin guards fillValueItems with @POST (it triggers a git
            // ls-remote under the hood), so it needs a CSRF crumb and a POST, unlike the
            // plain read-only GET used to discover the parameter name above. Some Jenkins
            // setups (e.g. behind a reverse proxy) also enforce a same-origin check on top
            // of the crumb, so send Origin/Referer matching what the job's own build page
            // would send, the same way the browser does.
            HttpHeaders headers = buildAuthHeaders(project);
            addCrumb(project, headers);
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.set(HttpHeaders.ORIGIN, jenkinsOrigin(jenkinsUrl));
            headers.set(HttpHeaders.REFERER, jenkinsUrl + "job/" + project.getJenkinsJobName() + "/build?delay=0sec");
            HttpEntity<String> request = new HttpEntity<>(headers);

            List<String> branches = new ArrayList<>();
            try {
                ResponseEntity<String> response = restTemplate.exchange(fillUrl, HttpMethod.POST, request, String.class);
                System.out.println("   Response status: " + response.getStatusCode());
                System.out.println("   Response body: " + response.getBody());

                if (response.getStatusCode().is2xxSuccessful()) {
                    JsonNode values = objectMapper.readTree(response.getBody()).get("values");
                    if (values != null && values.isArray()) {
                        for (JsonNode v : values) {
                            String value = v.has("value") ? v.get("value").asText() : v.path("name").asText(null);
                            if (value != null) {
                                branches.add(value);
                            }
                        }
                    }
                }
            } catch (HttpClientErrorException | HttpServerErrorException e) {
                // RestTemplate throws on non-2xx before we can log the body above, so surface
                // it here instead; Jenkins usually explains CSRF/permission failures in it.
                System.out.println("❌ fillValueItems failed. Status: " + e.getStatusCode() + ", body: " + e.getResponseBodyAsString());
                throw e;
            }
            System.out.println("   Parsed " + branches.size() + " branch(es)");

            result.put("success", true);
            result.put("branchParameterName", paramName);
            result.put("branches", branches);
        } catch (Exception e) {
            System.out.println("❌ Error getting Git branches: " + e.getMessage());
            e.printStackTrace();
            result.put("success", false);
            result.put("message", "Error getting Git branches: " + e.getMessage());
        }

        return result;
    }

    /**
     * Find the name of the job's Git Parameter branch field (Git Parameter plugin), by
     * inspecting the job's parameter definitions for one backed by that plugin. Returns
     * null if the job isn't configured with one, or if it can't be reached.
     */
    private String findGitBranchParameterName(Project project) {
        for (JsonNode paramDef : fetchParameterDefinitions(project)) {
            String klass = paramDef.path("_class").asText("");
            String type = paramDef.path("type").asText("");
            if (classifyParameterType(klass, type) == JenkinsParameterType.GIT_PARAMETER) {
                return paramDef.path("name").asText(null);
            }
        }
        return null;
    }

    /**
     * Get every parameter the job's build form declares (Git Parameter, String, Text,
     * Boolean, Choice, Password, or otherwise), so callers can render/submit a form that
     * matches whatever a given Jenkins job actually needs instead of a fixed field set.
     */
    public Map<String, Object> getJobParameters(Project project) {
        Map<String, Object> result = new HashMap<>();

        if (!isJenkinsConfigured(project)) {
            result.put("success", false);
            result.put("message", "Jenkins configuration is incomplete");
            return result;
        }

        List<Map<String, Object>> parameters = new ArrayList<>();
        for (JsonNode paramDef : fetchParameterDefinitions(project)) {
            String klass = paramDef.path("_class").asText("");
            String type = paramDef.path("type").asText("");
            JenkinsParameterType paramType = classifyParameterType(klass, type);

            Map<String, Object> param = new HashMap<>();
            param.put("name", paramDef.path("name").asText(null));
            param.put("type", paramType.name());
            param.put("description", paramDef.hasNonNull("description") ? paramDef.path("description").asText() : null);

            // Jenkins returns an encrypted Secret blob for a password parameter's default,
            // not a usable plaintext value - never surface it.
            if (paramType == JenkinsParameterType.PASSWORD) {
                param.put("defaultValue", null);
            } else {
                JsonNode defaultValue = paramDef.path("defaultParameterValue").path("value");
                param.put("defaultValue", defaultValue.isMissingNode() || defaultValue.isNull() ? null : defaultValue.asText());
            }

            if (paramType == JenkinsParameterType.CHOICE && paramDef.path("choices").isArray()) {
                List<String> choices = new ArrayList<>();
                for (JsonNode choice : paramDef.path("choices")) {
                    choices.add(choice.asText());
                }
                param.put("choices", choices);
            } else {
                param.put("choices", null);
            }

            parameters.add(param);
        }

        result.put("success", true);
        result.put("parameters", parameters);
        return result;
    }

    private enum JenkinsParameterType {
        GIT_PARAMETER, STRING, TEXT, BOOLEAN, CHOICE, PASSWORD, UNKNOWN
    }

    private JenkinsParameterType classifyParameterType(String klass, String type) {
        String k = klass.toLowerCase();
        String t = type.toLowerCase();
        if (k.contains("gitparameterdefinition") || t.contains("gitparameter")) {
            return JenkinsParameterType.GIT_PARAMETER;
        } else if (k.contains("booleanparameterdefinition") || t.contains("boolean")) {
            return JenkinsParameterType.BOOLEAN;
        } else if (k.contains("choiceparameterdefinition") || t.contains("choice")) {
            return JenkinsParameterType.CHOICE;
        } else if (k.contains("passwordparameterdefinition") || t.contains("password")) {
            return JenkinsParameterType.PASSWORD;
        } else if (k.contains("textparameterdefinition") || t.contains("text")) {
            return JenkinsParameterType.TEXT;
        } else if (k.contains("stringparameterdefinition") || t.contains("string")) {
            return JenkinsParameterType.STRING;
        }
        return JenkinsParameterType.UNKNOWN;
    }

    /**
     * Fetch the job's raw parameter definitions in one call. Freestyle jobs expose
     * ParametersDefinitionProperty under "actions"; Pipeline and multibranch jobs commonly
     * expose it under "property" instead - query both so parameters are found regardless
     * of job type. Returns an empty list if the job can't be reached or has none.
     */
    private List<JsonNode> fetchParameterDefinitions(Project project) {
        List<JsonNode> definitions = new ArrayList<>();
        try {
            String jenkinsUrl = normalizeJenkinsUrl(project.getJenkinsUrl());
            String url = jenkinsUrl + "job/" + project.getJenkinsJobName()
                + "/api/json?tree=actions[parameterDefinitions[name,type,_class,description,defaultParameterValue[value],choices]],"
                + "property[parameterDefinitions[name,type,_class,description,defaultParameterValue[value],choices]]";
            System.out.println("🔍 Looking up Jenkins job parameters: " + url);
            HttpEntity<String> request = new HttpEntity<>(buildAuthHeaders(project));
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, request, String.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                System.out.println("⚠️ Failed to fetch job parameters. Status: " + response.getStatusCode());
                return definitions;
            }

            // Jenkins can expose the same ParametersDefinitionProperty under both "actions"
            // and "property" for the same job (observed on Freestyle jobs), so dedupe by
            // parameter name rather than assuming each key contributes distinct parameters.
            JsonNode jobInfo = objectMapper.readTree(response.getBody());
            Set<String> seenNames = new HashSet<>();
            for (String key : new String[] {"actions", "property"}) {
                JsonNode entries = jobInfo.get(key);
                if (entries == null) {
                    continue;
                }
                for (JsonNode entry : entries) {
                    JsonNode paramDefs = entry.get("parameterDefinitions");
                    if (paramDefs == null) {
                        continue;
                    }
                    for (JsonNode paramDef : paramDefs) {
                        String name = paramDef.path("name").asText("");
                        if (!seenNames.add(name)) {
                            continue;
                        }
                        System.out.println("   Found parameter: " + name
                            + " (_class=" + paramDef.path("_class").asText("") + ", type=" + paramDef.path("type").asText("") + ")");
                        definitions.add(paramDef);
                    }
                }
            }
            if (definitions.isEmpty()) {
                System.out.println("⚠️ No parameters found on job: " + project.getJenkinsJobName());
            }
        } catch (Exception e) {
            System.out.println("⚠️ Could not discover job parameters: " + e.getMessage());
        }
        return definitions;
    }

    private String normalizeJenkinsUrl(String jenkinsUrl) {
        return jenkinsUrl.endsWith("/") ? jenkinsUrl : jenkinsUrl + "/";
    }

    /**
     * Derive the Origin header value (scheme://host[:port], no path) from a normalized
     * Jenkins base URL, for requests that need to look like they came from the Jenkins UI.
     */
    private String jenkinsOrigin(String normalizedJenkinsUrl) {
        java.net.URI uri = java.net.URI.create(normalizedJenkinsUrl);
        String origin = uri.getScheme() + "://" + uri.getHost();
        if (uri.getPort() != -1) {
            origin += ":" + uri.getPort();
        }
        return origin;
    }

    private HttpHeaders buildAuthHeaders(Project project) {
        HttpHeaders headers = new HttpHeaders();
        String auth = project.getJenkinsUsername() + ":" + project.getJenkinsToken();
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
        headers.set("Authorization", "Basic " + encodedAuth);
        return headers;
    }

    /**
     * Fetch a CSRF crumb from Jenkins and add it to the given headers, needed for
     * POST requests when CSRF protection is enabled. Some Jenkins instances validate
     * the crumb against the session it was issued under (not just the Basic Auth
     * identity), so the crumb-issuing response's session cookie is captured and
     * forwarded too - otherwise a session-tied crumb check fails with "No valid
     * crumb was included in the request" even though the crumb value itself is
     * correct. Returns false (headers left unchanged) if the crumb can't be obtained.
     */
    private boolean addCrumb(Project project, HttpHeaders headers) {
        try {
            String jenkinsUrl = normalizeJenkinsUrl(project.getJenkinsUrl());
            String crumbUrl = jenkinsUrl + "crumbIssuer/api/json";
            HttpEntity<String> crumbRequest = new HttpEntity<>(buildAuthHeaders(project));
            ResponseEntity<String> crumbResponse = restTemplate.exchange(crumbUrl, HttpMethod.GET, crumbRequest, String.class);
            if (crumbResponse.getStatusCode().is2xxSuccessful()) {
                JsonNode crumbJson = objectMapper.readTree(crumbResponse.getBody());
                headers.set(crumbJson.get("crumbRequestField").asText(), crumbJson.get("crumb").asText());

                List<String> setCookies = crumbResponse.getHeaders().get(HttpHeaders.SET_COOKIE);
                if (setCookies != null && !setCookies.isEmpty()) {
                    String cookieHeader = setCookies.stream()
                        .map(setCookie -> setCookie.split(";", 2)[0])
                        .collect(Collectors.joining("; "));
                    headers.set(HttpHeaders.COOKIE, cookieHeader);
                }
                return true;
            }
        } catch (Exception e) {
            System.out.println("⚠️ Could not fetch Jenkins crumb: " + e.getMessage());
        }
        return false;
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
