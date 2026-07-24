import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
public class TestJwtKey {
  public static void main(String[] args) {
    String secret = "parkingSystemSuperSecretKeyForJWTTokenGeneration2026ChangeThisInProduction";
    SecretKey key = Keys.hmacShaKeyFor(secret.getBytes());
    System.out.println(key.getAlgorithm());
  }
}
