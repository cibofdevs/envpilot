package com.cibofdevs.envpilot.service;

import com.cibofdevs.envpilot.model.Environment;
import com.cibofdevs.envpilot.repository.EnvironmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class EnvironmentService {
    @Autowired
    private EnvironmentRepository environmentRepository;

    public Optional<Environment> getEnvironmentById(Long id) {
        return environmentRepository.findById(id);
    }

    public List<Environment> getEnvironmentsByProjectId(Long projectId) {
        return environmentRepository.findByProjectId(projectId);
    }

    public Environment createEnvironment(Environment environment) {
        return environmentRepository.save(environment);
    }

    public Environment updateEnvironment(Environment environment) {
        return environmentRepository.save(environment);
    }

    public Environment deployToEnvironment(Long id, String version) {
        Optional<Environment> envOpt = environmentRepository.findById(id);
        if (envOpt.isPresent()) {
            Environment env = envOpt.get();
            env.setVersion(version);
            env.setStatus(Environment.Status.DEPLOYING);
            env.setLastDeployedAt(LocalDateTime.now());
            return environmentRepository.save(env);
        }
        return null;
    }

    public Environment updateEnvironmentStatus(Long id, Environment.Status status) {
        Optional<Environment> envOpt = environmentRepository.findById(id);
        if (envOpt.isPresent()) {
            Environment env = envOpt.get();
            env.setStatus(status);
            return environmentRepository.save(env);
        }
        return null;
    }
}