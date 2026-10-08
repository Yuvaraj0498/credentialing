package com.zmartcredential.dto.payer;

import java.util.List;

public record PayerSubmissionBatchResponse(String integration, String message, List<PayerSubmissionResponse> submissions) {
}
