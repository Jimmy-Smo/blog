package blog;

import com.github.tomakehurst.wiremock.WireMockServer;
import org.junit.jupiter.api.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.*;

class QuoteServerIT {
    private WireMockServer upstream;
    private QuoteServer app;
    private HttpClient client;

    @BeforeEach void start() throws Exception {
        upstream = new WireMockServer(0);
        upstream.start();
        app = new QuoteServer(0, URI.create(upstream.baseUrl()));
        client = HttpClient.newHttpClient();
    }

    @AfterEach void stop() {
        if (app != null) app.close();
        if (client != null) client.close();
        if (upstream != null) upstream.stop();
    }

    private HttpResponse<String> call() throws Exception {
        return client.send(HttpRequest.newBuilder(app.uri())
            .timeout(Duration.ofSeconds(5)).header("X-Request-Id", "debug-001")
            .GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test void returnsFeeAndForwardsRequestId() throws Exception {
        upstream.stubFor(get(urlEqualTo("/shipping-fee"))
            .willReturn(ok("1299")));
        var response = call();
        assertEquals(200, response.statusCode());
        assertEquals("{\"shippingFee\":1299}", response.body());
        assertEquals("debug-001", response.headers().firstValue("X-Request-Id").orElseThrow());
        upstream.verify(getRequestedFor(urlEqualTo("/shipping-fee"))
            .withHeader("X-Request-Id", equalTo("debug-001")));
    }

    @Test void mapsUpstreamTimeoutTo504() throws Exception {
        upstream.stubFor(get(urlEqualTo("/shipping-fee"))
            .willReturn(ok("1299").withFixedDelay(1500)));
        var response = call();
        assertEquals(504, response.statusCode());
        assertEquals("{\"code\":\"UPSTREAM_TIMEOUT\"}", response.body());
    }

    @Test void mapsUpstream500To502() throws Exception {
        upstream.stubFor(get(urlEqualTo("/shipping-fee"))
            .willReturn(aResponse().withStatus(500)));
        var response = call();
        assertEquals(502, response.statusCode());
        assertEquals("{\"code\":\"UPSTREAM_ERROR\"}", response.body());
    }

    @Test void rejectsMalformedFee() throws Exception {
        upstream.stubFor(get(urlEqualTo("/shipping-fee"))
            .willReturn(ok("not-a-number")));
        assertEquals(502, call().statusCode());
    }
}
