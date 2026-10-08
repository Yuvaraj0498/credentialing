package com.zmartcredential.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI credentialingOpenApi() {
        return new OpenAPI()
                .info(new Info().title("ZmartCredential API")
                        .description("Provider credentialing platform REST API. Authenticate with POST /api/auth/login, "
                                + "then use the access token as a Bearer token. Platform admins choose the tenant with the X-Org-Id header.")
                        .version("1.0"))
                .components(new Components().addSecuritySchemes("bearer",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }
}
