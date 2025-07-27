package com.cibofdevs.envpilot.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ErrorHandlerConfig {

    private static final Logger logger = LoggerFactory.getLogger(ErrorHandlerConfig.class);

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatCustomizer() {
        return factory -> {
            factory.addConnectorCustomizers(connector -> {
                // Set error handling for malformed requests
                connector.setProperty("socket.directBuffer", "false");
                connector.setProperty("socket.directSslBuffer", "false");
                
                // Increase buffer sizes to handle malformed requests better
                connector.setProperty("socket.rxBufSize", "8192");
                connector.setProperty("socket.txBufSize", "8192");
                
                // Set connection timeout
                connector.setProperty("connectionTimeout", "60000");
                
                // Log connection errors at WARN level instead of INFO
                connector.setProperty("org.apache.tomcat.util.net.NioEndpoint.level", "WARN");
            });
        };
    }
} 