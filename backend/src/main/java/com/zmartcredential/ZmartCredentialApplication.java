package com.zmartcredential;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ZmartCredentialApplication {

	public static void main(String[] args) {
		SpringApplication.run(ZmartCredentialApplication.class, args);
	}

}
