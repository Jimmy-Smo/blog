package blog;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.Executors;

// 本地文章示例：只监听回环地址，不是生产服务器模板。
public final class QuoteServer implements AutoCloseable {
    private final HttpServer server;
    private final java.util.concurrent.ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    private final HttpClient client = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(1)).build();
    private final URI upstream;

    public QuoteServer(int port, URI upstream) throws IOException {
        this.upstream = upstream.resolve("/shipping-fee");
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.setExecutor(executor);
        server.createContext("/quote", this::quote);
        server.start();
    }

    public URI uri() {
        return URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/quote");
    }

    private void quote(HttpExchange exchange) throws IOException {
        String supplied = exchange.getRequestHeaders().getFirst("X-Request-Id");
        String requestId = supplied != null && supplied.matches("[A-Za-z0-9-]{1,64}")
            ? supplied : UUID.randomUUID().toString();
        exchange.getResponseHeaders().set("X-Request-Id", requestId);
        try (exchange) {
            if (!exchange.getRequestMethod().equals("GET") || !exchange.getRequestURI().getPath().equals("/quote")) {
                respond(exchange, 404, "{\"code\":\"NOT_FOUND\"}");
                return;
            }
            var request = HttpRequest.newBuilder(upstream)
                .timeout(Duration.ofMillis(300))
                .header("X-Request-Id", requestId).GET().build();
            try {
                var result = client.send(request, HttpResponse.BodyHandlers.ofString());
                if (result.statusCode() != 200) {
                    System.err.println("requestId=" + requestId + " upstreamStatus=" + result.statusCode());
                    respond(exchange, 502, "{\"code\":\"UPSTREAM_ERROR\"}");
                    return;
                }
                long fee = Long.parseLong(result.body().trim());
                if (fee < 0) throw new NumberFormatException("negative fee");
                respond(exchange, 200, "{\"shippingFee\":" + fee + "}");
            } catch (HttpTimeoutException e) {
                System.err.println("requestId=" + requestId + " upstreamTimeout=" + upstream);
                respond(exchange, 504, "{\"code\":\"UPSTREAM_TIMEOUT\"}");
            } catch (NumberFormatException | IOException e) {
                System.err.println("requestId=" + requestId + " upstreamFailure=" + e.getClass().getSimpleName());
                respond(exchange, 502, "{\"code\":\"UPSTREAM_ERROR\"}");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                respond(exchange, 503, "{\"code\":\"INTERRUPTED\"}");
            }
        }
    }

    private static void respond(HttpExchange exchange, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
    }

    @Override public void close() {
        server.stop(0);
        executor.shutdownNow();
        client.close();
    }

    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        URI upstream = URI.create(System.getenv().getOrDefault("UPSTREAM_URL", "http://127.0.0.1:8089"));
        var app = new QuoteServer(port, upstream);
        Runtime.getRuntime().addShutdownHook(new Thread(app::close));
        System.out.println("Quote endpoint: " + app.uri());
        new java.util.concurrent.CountDownLatch(1).await();
    }
}
