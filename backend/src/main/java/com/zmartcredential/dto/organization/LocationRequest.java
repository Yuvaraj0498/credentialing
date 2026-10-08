package com.zmartcredential.dto.organization;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record LocationRequest(
        @NotBlank(message = "Location name is required") @Size(min = 2, max = 150, message = "2-150 characters")
        @Pattern(regexp = ".*[A-Za-z].*", message = "Location name must contain letters") String name,
        Long practiceId,
        @Size(max = 200, message = "Max 200 characters") String legalName,
        @Pattern(regexp = "^$|[0-9]{10}", message = "NPI must be 10 digits") String npi,
        @Pattern(regexp = "^$|Primary|Satellite|Hospital|Admin Office", message = "Choose a valid location type") String locationType,
        /* optional, as in the prototype; when given: 5-255 characters including a street name */
        @Size(max = 255, message = "Max 255 characters")
        @Pattern(regexp = "^$|(?=.{5,})[\\p{L}0-9 #,.:'/&()-]*\\p{L}[\\p{L}0-9 #,.:'/&()-]*", message = "Address may contain letters, digits and # , . : - / ' & ( ), be at least 5 characters and include a street name") String address,
        /* optional: the Organization "Add Location" form has no city / ZIP */
        @Pattern(regexp = "^$|[A-Za-z .'-]{2,100}", message = "City may contain letters, spaces, . ' - only") String city,
        @Pattern(regexp = "^$|[A-Z]{2}", message = "Select a state") String state,
        @Pattern(regexp = "^$|[0-9]{5}", message = "ZIP must be 5 digits") String zip,
        @Pattern(regexp = "^$|[0-9]{10}", message = "Phone must be 10 digits") String phone,
        @DecimalMin(value = "-90", message = "Invalid latitude") @DecimalMax(value = "90", message = "Invalid latitude") BigDecimal lat,
        @DecimalMin(value = "-180", message = "Invalid longitude") @DecimalMax(value = "180", message = "Invalid longitude") BigDecimal lng,
        Boolean active) {
}
