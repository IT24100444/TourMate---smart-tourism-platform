/// Simple in-memory token store for the duration of the app session.
/// When the tourist logs in, the token is stored here.
/// It persists as long as the app process is alive.
class AuthProvider {
  AuthProvider._();

  static String? _token;
  static String? _userId;
  static String? _userEmail;

  static void setSession({required String token, required String userId, required String email}) {
    _token = token;
    _userId = userId;
    _userEmail = email;
  }

  static void clearSession() {
    _token = null;
    _userId = null;
    _userEmail = null;
  }

  static Future<String?> getToken() async => _token;

  static String? get token => _token;
  static String? get userId => _userId;
  static String? get userEmail => _userEmail;
  static bool get isLoggedIn => _token != null && _token!.isNotEmpty;
}
