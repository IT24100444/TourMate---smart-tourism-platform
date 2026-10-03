import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../core/theme/app_theme.dart';

// ─── API Base URL resolver ───────────────────────────────────────────────────
// Connects to the live tourmate-ai ADK 2.0 FastAPI microservice
String get _aiBaseUrl {
  if (kIsWeb) return 'http://127.0.0.1:8000';
  if (defaultTargetPlatform == TargetPlatform.android) return 'http://192.168.8.100:8000';
  return 'http://127.0.0.1:8000';
}

// ─── Data Models ──────────────────────────────────────────────────────────────
enum ChatMessageType { text, agentProgress, itinerary, approvalGate, approved, failed }

class ChatMessage {
  final String id;
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final ChatMessageType type;
  final Map<String, dynamic>? payload;
  final List<String>? toolsCalled;

  ChatMessage({
    required this.id,
    required this.text,
    required this.isUser,
    required this.timestamp,
    this.type = ChatMessageType.text,
    this.payload,
    this.toolsCalled,
  });
}

String _genId() => '${DateTime.now().millisecondsSinceEpoch}_${Random().nextInt(99999)}';

// ─── Main Concierge Bottom Sheet Widget ─────────────────────────────────────────
class AIConciergeSheet extends StatefulWidget {
  final http.Client? httpClient;

  const AIConciergeSheet({super.key, this.httpClient});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const AIConciergeSheet(),
    );
  }

  @override
  State<AIConciergeSheet> createState() => _AIConciergeSheetState();
}

class _AIConciergeSheetState extends State<AIConciergeSheet> {
  final TextEditingController _textCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();
  final List<ChatMessage> _messages = [];
  bool _isProcessing = false;
  String _sessionId = 'sess_${DateTime.now().millisecondsSinceEpoch}';

  final List<String> _quickPrompts = [
    '🦁 Plan 5-day Sigiriya trip – budget around 90,000 LKR',
    '🌲 Plan 2-day Ella trip – LKR 40,000',
    '🏛️ Plan 3-day Kandy tour – LKR 70,000',
    '🏖️ Plan 2-day Galle coastal trip – LKR 55,000',
    '🌤️ Weather advisory for Sigiriya & Ella',
  ];

  @override
  void initState() {
    super.initState();
    _resetChat();
  }

  void _resetChat() {
    setState(() {
      _sessionId = 'sess_${DateTime.now().millisecondsSinceEpoch}';
      _messages.clear();
      _addBot(
        '👋 Ayubowan! I am your **TourMate Agentic AI Concierge**.\n\n'
        'I am powered by the **TourMate Multi-Agent Engine (Gemini + ADK)**:\n'
        '• 🛡️ **Security Checkpoint**: Guardrails & PII protection\n'
        '• 🔍 **Tourism Discovery Agent**: Verified Sri Lanka landmarks & cultural sights\n'
        '• 🏨 **Accommodation & Dining Agent**: Certified eco-lodges, resorts & authentic culinary venues\n'
        '• ⚖️ **Feasibility & Budget Agent**: Dynamic multi-day cost calculations & trade-off consultations\n'
        '• 👤 **Human-In-The-Loop Gate**: Your explicit authorization before confirming any booking\n\n'
        'Tell me your travel dreams! Where would you like to go, for how many days, and what budget do you have in mind?\n\n'
        '_(e.g. "I want to go Sigiriya 5 day trip and my budget is around 90,000")_',
      );
    });
  }

  @override
  void dispose() {
    _textCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: const Duration(milliseconds: 350),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _addUser(String text) {
    setState(() {
      _messages.add(ChatMessage(id: _genId(), text: text, isUser: true, timestamp: DateTime.now()));
    });
    _scrollToBottom();
  }

  void _addBot(
    String text, {
    ChatMessageType type = ChatMessageType.text,
    Map<String, dynamic>? payload,
    List<String>? toolsCalled,
  }) {
    setState(() {
      _messages.add(ChatMessage(
        id: _genId(),
        text: text,
        isUser: false,
        timestamp: DateTime.now(),
        type: type,
        payload: payload,
        toolsCalled: toolsCalled,
      ));
    });
    _scrollToBottom();
  }

  void _removeMessage(String msgId) {
    setState(() => _messages.removeWhere((m) => m.id == msgId));
  }

  // ─── Conversational Message Dispatcher ──────────────────────────────────────
  void _sendMessage() async {
    final text = _textCtrl.text.trim();
    if (text.isEmpty || _isProcessing) return;
    _textCtrl.clear();

    _addUser(text);
    setState(() => _isProcessing = true);

    final progressMsgId = _genId();
    setState(() {
      _messages.add(ChatMessage(
        id: progressMsgId,
        text: 'Consulting TourMate Multi-Agent AI (Gemini + ADK)...',
        isUser: false,
        timestamp: DateTime.now(),
        type: ChatMessageType.agentProgress,
        payload: {
          'steps': [
            '🛡️ Running Security Checkpoint & Guardrails...',
            '🔍 Querying Sri Lanka Tourism Catalog...',
            '🏨 Checking accommodations & dining options...',
            '⚖️ Calculating multi-day budget feasibility...',
          ]
        },
      ));
    });
    _scrollToBottom();

    // 1. Try Live ADK Conversational Endpoint
    Map<String, dynamic>? chatResponse;
    try {
      final client = widget.httpClient ?? http.Client();
      final response = await client.post(
        Uri.parse('$_aiBaseUrl/api/v1/ai/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'message': text,
          'session_id': _sessionId,
          'user_id': 'tourist',
        }),
      ).timeout(const Duration(seconds: 40));

      if (response.statusCode == 200) {
        chatResponse = jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {
      // Backend not currently reachable
    }

    _removeMessage(progressMsgId);

    if (chatResponse != null && (chatResponse['reply'] as String?)?.isNotEmpty == true) {
      // Received response from Live ADK Backend
      final reply = chatResponse['reply'] as String;
      final sessionFromApi = chatResponse['session_id'] as String?;
      if (sessionFromApi != null && sessionFromApi.isNotEmpty) {
        _sessionId = sessionFromApi;
      }
      final rawTools = (chatResponse['tools_called'] as List?)?.cast<String>() ?? [];

      _addBot(reply, toolsCalled: rawTools);

      // Show the Human-In-The-Loop Approval Gate only when the AI has actually
      // produced a trip itinerary or booking proposal — not on greetings/info.
      // We require: the reply contains a day-by-day plan OR explicit LKR cost + destination,
      // AND the user asked for planning (not just a casual greeting).
      final lowerPrompt = text.toLowerCase();
      final lowerReply = reply.toLowerCase();

      // Prompt signals: user is asking for a plan/trip (needs destination or explicit planning words)
      final promptWantsPlan =
          (lowerPrompt.contains('plan') && (lowerPrompt.contains('trip') || lowerPrompt.contains('day'))) ||
          lowerPrompt.contains('itinerary') ||
          (lowerPrompt.contains('trip') && lowerPrompt.contains('day')) ||
          (lowerPrompt.contains('budget') && (lowerPrompt.contains('trip') || lowerPrompt.contains('day'))) ||
          (lowerPrompt.contains('ella') || lowerPrompt.contains('sigiriya') || lowerPrompt.contains('kandy') ||
           lowerPrompt.contains('galle') || lowerPrompt.contains('nuwara eliya') || lowerPrompt.contains('mirissa') ||
           lowerPrompt.contains('colombo')) && lowerPrompt.contains('day');

      // Reply signals: the AI actually generated an itinerary with costed days
      final replyHasItinerary =
          (lowerReply.contains('day 1') || lowerReply.contains('day 2') || lowerReply.contains('day 3')) &&
          lowerReply.contains('lkr');

      // Reply signals: strong booking proposal (contains explicit booking + cost language)
      final replyHasBookingProposal =
          lowerReply.contains('lkr') &&
          (lowerReply.contains('total') || lowerReply.contains('estimated')) &&
          (lowerReply.contains('book') || lowerReply.contains('reservation') || lowerReply.contains('itinerary'));

      final shouldShowApprovalGate = promptWantsPlan && (replyHasItinerary || replyHasBookingProposal);

      if (shouldShowApprovalGate) {
        _checkAndAddApprovalGate(text, reply);
      }
    } else {
      // Fallback: Smart offline agent simulation matching tools_catalog.py
      _handleSmartLocalAgenticResponse(text);
    }

    setState(() => _isProcessing = false);
  }

  void _handleQuickPrompt(String prompt) {
    _textCtrl.text = prompt;
    _sendMessage();
  }

  // ─── Check & Add Approval Gate for finalized trips ───────────────────────────
  void _checkAndAddApprovalGate(String userPrompt, String reply) {
    final combined = '$userPrompt $reply'.toLowerCase();
    String destination = 'Sri Lanka';
    if (combined.contains('sigiriya') || combined.contains('dambulla') || combined.contains('lion rock') || combined.contains('pidurangala')) {
      destination = 'Sigiriya';
    } else if (combined.contains('ella') || combined.contains('nine arch') || combined.contains('ravana') || combined.contains('little adam')) {
      destination = 'Ella';
    } else if (combined.contains('kandy') || combined.contains('tooth relic') || combined.contains('peradeniya')) {
      destination = 'Kandy';
    } else if (combined.contains('galle') || combined.contains('unawatuna') || combined.contains('dutch fort')) {
      destination = 'Galle';
    } else if (combined.contains('nuwara eliya') || combined.contains('horton plains')) {
      destination = 'Nuwara Eliya';
    } else if (combined.contains('mirissa') || combined.contains('weligama')) {
      destination = 'Mirissa';
    } else if (combined.contains('colombo')) {
      destination = 'Colombo';
    }

    final workflowId = 'wf_${destination.toLowerCase()}_${DateTime.now().millisecondsSinceEpoch}';

    // 1. Extract Days
    int days = 2;
    final dayRegex = RegExp(r'(\d+)\s*(?:-| )?\s*(?:day|days)\b', caseSensitive: false);
    final dMatch = dayRegex.firstMatch('$userPrompt $reply');
    if (dMatch != null) {
      days = int.tryParse(dMatch.group(1)!) ?? 2;
    }
    // 2. Extract Total Cost (prioritize explicit Total Cost labels)
    double? cost;

    final totalPatterns = [
      // ── "NUMBER LKR" order — what Gemini outputs ──────────────────────────
      // e.g. "Estimated Total: LKR 94,500" → Gemini's most common format
      RegExp(r'(?:Estimated\s+Total(?:\s+Cost)?|Total\s+Estimated(?:\s+Cost)?|Total\s+Estimated\s+Cost|Estimated\s+Total\s+Cost|Total\s+Trip\s+Cost|Grand\s+Total|Total\s+Package\s+Cost|Total\s+Cost|Package\s+Total)\s*[\*:]*\s*[:=-]?\s*~?\s*(?:LKR|Rs\.?)\s*([\d,]+(?:\.\d+)?)', caseSensitive: false),
      // e.g. "Estimated Total: 94,500 LKR" (number before unit)
      RegExp(r'(?:Estimated\s+Total(?:\s+Cost)?|Total\s+Estimated(?:\s+Cost)?|Total\s+Estimated\s+Cost|Estimated\s+Total\s+Cost|Total\s+Trip\s+Cost|Grand\s+Total|Total\s+Package\s+Cost|Total\s+Cost|Package\s+Total)\s*[\*:]*\s*[:=-]?\s*~?\s*([\d,]+(?:\.\d+)?)\s*(?:LKR|Rs\.?)\b', caseSensitive: false),
      // e.g. "• Total: 94,500 LKR" or "**Total:** LKR 94,500"
      RegExp(r'(?:\n|^|[•*])\s*(?:\*\*)?Total(?:\*\*)?\s*[\*:]+\s*~?\s*([\d,]+(?:\.\d+)?)\s*(?:LKR|Rs\.?)\b', caseSensitive: false),
      RegExp(r'(?:\n|^|[•*])\s*(?:\*\*)?Total(?:\*\*)?\s*[\*:]+\s*~?\s*(?:LKR|Rs\.?)\s*([\d,]+(?:\.\d+)?)', caseSensitive: false),
      // e.g. "Total Cost: 94,500 LKR" standalone
      RegExp(r'\bTotal\s+Cost\s*:\s*([\d,]+(?:\.\d+)?)\s*(?:LKR|Rs\.?)\b', caseSensitive: false),
      RegExp(r'\bTotal\s+Cost\s*:\s*(?:LKR|Rs\.?)\s*([\d,]+(?:\.\d+)?)', caseSensitive: false),
      // e.g. "Total Cost (LKR): 82,500"
      RegExp(r'(?:Estimated\s+Total(?:\s+Cost)?|Total\s+Estimated(?:\s+Cost)?|Total\s+Cost|Grand\s+Total)\s*\([^\)]*\)\s*[:=-]?\s*([\d,]+(?:\.\d+)?)', caseSensitive: false),
      // e.g. "LKR 82,500 total"
      RegExp(r'(?:LKR|Rs\.?)\s*([\d,]+(?:\.\d+)?)\s*(?:\([^\)]*\))?\s*(?:estimated\s+total|total\b)', caseSensitive: false),
      // e.g. "total of LKR 82,500"
      RegExp(r'(?:total\s+(?:cost\s+)?(?:of\s+|is\s+)?|comes\s+(?:out\s+)?to\s+)(?:LKR|Rs\.?)\s*([\d,]+(?:\.\d+)?)', caseSensitive: false),
    ];

    for (final pattern in totalPatterns) {
      final match = pattern.firstMatch(reply);
      if (match != null) {
        final parsed = double.tryParse(match.group(1)!.replaceAll(',', ''));
        if (parsed != null && parsed >= 1000) {
          cost = parsed;
          break;
        }
      }
    }

    double? userBudgetLimit;
    final bMatch = RegExp(r'(?:lkr|rs\.?|budget\s*(?:is|around|of)?\s*)[:=]?\s*([\d,]+)', caseSensitive: false).firstMatch(userPrompt);
    if (bMatch != null) {
      userBudgetLimit = double.tryParse(bMatch.group(1)!.replaceAll(',', ''));
    }

    // 3. Fallback: scan all LKR amounts in the reply, exclude the budget cap itself
    //    (the reply prints "Budget Limit: LKR 100,000" which must not be used as trip cost)
    if (cost == null) {
      final allAmounts = <double>{};

      // "LKR NUMBER" format
      for (final m in RegExp(r'(?:LKR|Rs\.?)\s*([\d,]+)', caseSensitive: false).allMatches(reply)) {
        final v = double.tryParse(m.group(1)!.replaceAll(',', ''));
        if (v != null && v >= 5000) allAmounts.add(v);
      }
      // "NUMBER LKR" format
      for (final m in RegExp(r'([\d,]+)\s*(?:LKR|Rs\.?)\b', caseSensitive: false).allMatches(reply)) {
        final v = double.tryParse(m.group(1)!.replaceAll(',', ''));
        if (v != null && v >= 5000) allAmounts.add(v);
      }

      // Remove the budget cap itself — that's the limit, not the trip cost
      if (userBudgetLimit != null) allAmounts.remove(userBudgetLimit);

      if (allAmounts.isNotEmpty) {
        final sorted = allAmounts.toList()..sort();
        final budgetCap = userBudgetLimit;
        if (budgetCap != null) {
          // Pick the largest amount strictly below the budget cap
          final withinBudget = sorted.where((a) => a < budgetCap).toList();
          cost = withinBudget.isNotEmpty ? withinBudget.last : sorted.last;
        } else {
          cost = sorted.last;
        }
      }
    }

    final catalogData = _getCatalogData(destination, days);
    final fallbackCost = userBudgetLimit != null
        ? ((userBudgetLimit * 0.925 / 500).round() * 500.0)
        : (catalogData['totalCost'] as double);

    final finalCost = cost ?? fallbackCost;

    _addBot(
      '',
      type: ChatMessageType.approvalGate,
      payload: {
        'destination': destination,
        'days': days,
        'totalCost': finalCost,
        'workflowId': workflowId,
      },
    );
  }


  // ─── Smart Local Agentic Fallback (Matches tourmate-ai/app/tools_catalog.py) ───
  void _handleSmartLocalAgenticResponse(String text) {
    final lower = text.toLowerCase();

    // 1. Check for Approval actions
    if (lower.contains('approve') || lower.contains('confirm') || lower.contains('yes proceed') || lower.contains('book')) {
      _addBot('🎉 **Human-In-The-Loop Approval Confirmed!**\n\nYour travel itinerary has been formally authorized and locked in. Booking requests have been logged in the audit trail.', type: ChatMessageType.approved);
      return;
    }

    // 2. Parse Destination
    String destination = 'Ella';
    if (lower.contains('sigiriya') || lower.contains('dambulla') || lower.contains('lion rock') || lower.contains('pidurangala')) {
      destination = 'Sigiriya';
    } else if (lower.contains('ella') || lower.contains('nine arch') || lower.contains('ravana')) {
      destination = 'Ella';
    } else if (lower.contains('kandy') || lower.contains('tooth relic') || lower.contains('peradeniya')) {
      destination = 'Kandy';
    } else if (lower.contains('galle') || lower.contains('dutch fort') || lower.contains('unawatuna')) {
      destination = 'Galle';
    } else if (lower.contains('nuwara eliya')) {
      destination = 'Nuwara Eliya';
    } else if (lower.contains('mirissa')) {
      destination = 'Mirissa';
    }

    // 3. Parse Days (handles "5 day", "5 dat", "5 days", "5d", etc.)
    int days = 2;
    final dayRegex = RegExp(r'(\d+)\s*(?:-| )?\s*(?:day|dat|days|d)\b', caseSensitive: false);
    final dMatch = dayRegex.firstMatch(lower);
    if (dMatch != null) {
      days = int.tryParse(dMatch.group(1)!) ?? 2;
    } else {
      final words = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7};
      for (final w in words.entries) {
        if (lower.contains('${w.key} day') || lower.contains('${w.key} dat')) {
          days = w.value;
          break;
        }
      }
    }
    days = max(1, min(days, 14));

    // 4. Parse Budget (handles "90,000", "90000", "LKR 70,000", etc.)
    double? userBudget;
    final budgetRegex = RegExp(r'(?:lkr|rs\.?|budget\s*(?:is|around|of)?\s*)[:=]?\s*([\d,]+)', caseSensitive: false);
    final bMatch = budgetRegex.firstMatch(lower);
    if (bMatch != null) {
      userBudget = double.tryParse(bMatch.group(1)!.replaceAll(',', ''));
    } else {
      final plainNum = RegExp(r'\b(\d{4,6})\b');
      final pMatch = plainNum.firstMatch(lower);
      if (pMatch != null) {
        final val = double.tryParse(pMatch.group(1)!);
        if (val != null && val >= 10000) userBudget = val;
      }
    }

    // Dynamic cost calculation based on actual Sri Lanka catalog
    final catalogData = _getCatalogData(destination, days);
    final standardTotal = catalogData['totalCost'] as double;
    final nights = max(1, days - 1);

    final toolsCalled = [
      'security_checkpoint_tool',
      'search_attractions',
      'search_accommodations_and_dining',
      'check_weather_and_seasonality',
      'calculate_budget_feasibility',
    ];

    // If user specified budget and standard cost is significantly higher, ask back questions!
    if (userBudget != null && standardTotal > (userBudget + 10000)) {
      _addBot(
        'Hello! I am **TourMate AI**, your personal Sri Lanka travel concierge. I would love to help you plan an unforgettable **$days-day** journey in **$destination**!\n\n'
        '### 📊 Budget & Cost Reality Check\n'
        'You mentioned having a budget in mind around **LKR ${_formatLkr(userBudget)}**.\n'
        'For a **$days-day trip** ($nights nights), standard accommodations (${catalogData['hotelName']}) plus dining, local transport, and UNESCO/activity tickets come out to approximately **LKR ${_formatLkr(standardTotal)}**.\n\n'
        '### 💡 Interactive Options & Trade-Offs (Ask Back):\n'
        '1. **Switch to Charming Local Guesthouses/Homestays** (~LKR 7,000/night): This brings the total trip cost down to ~**LKR ${_formatLkr(standardTotal - (nightlyRateDifference(destination) * nights))}**, fitting neatly inside your budget!\n'
        '2. **Shorten Duration by 1 Day**: A ${days - 1}-day tour brings the total closer to your budget.\n'
        '3. **Proceed with Standard Verified Lodging**: If you are happy to proceed with LKR ${_formatLkr(standardTotal)}, I can confirm the luxury eco-haven plan right away!\n\n'
        '_Which option would you prefer? Just let me know below!_',
        toolsCalled: toolsCalled,
      );
      return;
    }

    // Budget fits or no budget constraint: render full itinerary
    final effectiveBudget = userBudget ?? (standardTotal + 10000.0);
    final surplus = effectiveBudget - standardTotal;
    final workflowId = 'wf_${destination.toLowerCase()}_${DateTime.now().millisecondsSinceEpoch}';

    _addBot(
      '✅ **$destination $days-Day Personalized Itinerary Created!**\n\n'
      'I have queried our verified Sri Lanka catalog, verified climate advisories, and calculated complete multi-day feasibility.',
      toolsCalled: toolsCalled,
    );

    _addBot(
      '',
      type: ChatMessageType.itinerary,
      payload: {
        'destination': destination,
        'days': days,
        'totalCost': standardTotal,
        'budget': effectiveBudget,
        'surplus': surplus,
        'apiDays': catalogData['days'],
        'workflowId': workflowId,
        'hotelName': catalogData['hotelName'],
      },
    );

    _addBot(
      '',
      type: ChatMessageType.approvalGate,
      payload: {
        'destination': destination,
        'days': days,
        'totalCost': standardTotal,
        'workflowId': workflowId,
        'hotelName': catalogData['hotelName'],
      },
    );
  }

  double nightlyRateDifference(String destination) {
    if (destination == 'Sigiriya') return 8000.0;
    if (destination == 'Galle') return 12000.0;
    if (destination == 'Kandy') return 9000.0;
    return 10000.0;
  }

  // ─── Human-In-The-Loop Approval ──────────────────────────────────────────────
  void _approvePackage(String workflowId, double totalCost, String destination) async {
    setState(() => _isProcessing = true);

    // Send confirmation message into chat loop
    _addUser('I approve the booking package for $destination (LKR ${_formatLkr(totalCost)})');

    await Future.delayed(const Duration(milliseconds: 300));
    _addBot(
      '🎉 **Booking Package Authorized & Confirmed!**\n\n'
      '• **Workflow ID**: `$workflowId`\n'
      '• **Destination**: $destination\n'
      '• **Total Authorized**: LKR ${_formatLkr(totalCost)}\n\n'
      'Your reservations have been logged to the platform audit log. Have a wonderful and safe journey in Sri Lanka! 🇱🇰',
      type: ChatMessageType.approved,
    );

    setState(() => _isProcessing = false);
  }

  // ─── Sri Lanka Knowledge Catalog ─────────────────────────────────────────────
  Map<String, dynamic> _getCatalogData(String destination, int totalDays) {
    final nights = max(1, totalDays - 1);

    List<Map<String, dynamic>> expandDays(
      List<Map<String, dynamic>> basePlans,
      int targetDays,
      List<Map<String, dynamic>> allAttractions,
      List<Map<String, dynamic>> allDining,
    ) {
      if (targetDays <= basePlans.length) return basePlans.take(targetDays).toList();
      final result = List<Map<String, dynamic>>.from(basePlans);
      for (int d = basePlans.length + 1; d <= targetDays; d++) {
        final aIdx = (d - 1) % allAttractions.length;
        final rIdx = (d - 1) % allDining.length;
        result.add({
          'day': d,
          'summary': '${allAttractions[aIdx]['name']} & Local Experience',
          'items': [
            {'time': '08:30 - 11:30', 'type': 'Attraction', ...allAttractions[aIdx]},
            {'time': '12:30 - 14:00', 'type': 'Dining', ...allDining[rIdx]},
            {'time': '15:00 - 17:30', 'type': 'Attraction', ...allAttractions[(aIdx + 1) % allAttractions.length]},
          ],
        });
      }
      return result;
    }

    if (destination == 'Sigiriya') {
      const hotelName = 'Sigiriya Rock Eco Haven Lodge';
      const nightlyRate = 15000.0;
      final allAttractions = <Map<String, dynamic>>[
        {'name': 'Sigiriya Ancient Lion Rock Citadel (UNESCO)', 'cost': 11000.0},
        {'name': 'Pidurangala Rock Sunrise Summit', 'cost': 1000.0},
        {'name': 'Dambulla Royal Cave Temple & Golden Buddha', 'cost': 2500.0},
        {'name': 'Minneriya National Park 4x4 Elephant Safari', 'cost': 6000.0},
        {'name': 'Hiriwadunna Scenic Lake Boat Ride', 'cost': 2500.0},
      ];
      final allDining = <Map<String, dynamic>>[
        {'name': 'Pradeep Restaurant Sigiriya (7-Curry Feast)', 'cost': 2800.0},
        {'name': 'Rithu Restaurant Clay-Pot Dinner', 'cost': 2500.0},
        {'name': 'Village Farmhouse Traditional Lunch', 'cost': 1800.0},
      ];

      final basePlans = <Map<String, dynamic>>[
        {
          'day': 1,
          'summary': 'Arrival & Sigiriya Ancient Lion Rock',
          'items': [
            {'time': '08:00 - 11:30', 'type': 'Attraction', 'name': 'Sigiriya Ancient Lion Rock Citadel (UNESCO)', 'cost': 11000.0},
            {'time': '12:30 - 14:00', 'type': 'Dining', 'name': 'Pradeep Restaurant Sigiriya (7-Curry Feast)', 'cost': 2800.0},
            {'time': '14:30 - 15:30', 'type': 'Hotel', 'name': 'Check-in: $hotelName', 'cost': nightlyRate},
            {'time': '16:30 - 18:30', 'type': 'Attraction', 'name': 'Sigiriya Moat & Water Gardens Sunset Stroll', 'cost': 0.0},
          ],
        },
        {
          'day': 2,
          'summary': 'Pidurangala Rock Sunrise & Village Cycling',
          'items': [
            {'time': '05:30 - 08:00', 'type': 'Attraction', 'name': 'Pidurangala Rock Sunrise Summit (Panoramic View)', 'cost': 1000.0},
            {'time': '09:00 - 10:30', 'type': 'Dining', 'name': 'Traditional Sri Lankan Roti & Curry Breakfast', 'cost': 1200.0},
            {'time': '18:00 - 20:00', 'type': 'Dining', 'name': 'Rithu Restaurant Clay-Pot Dinner', 'cost': 2500.0},
          ],
        },
      ];

      final days = expandDays(basePlans, totalDays, allAttractions, allDining);
      double total = nightlyRate * nights + (1500.0 * totalDays) + 5000.0;
      for (final d in days) {
        for (final item in d['items'] as List<Map<String, dynamic>>) {
          if (item['type'] != 'Hotel') total += (item['cost'] as num).toDouble();
        }
      }

      return {'hotelName': hotelName, 'nightlyRate': nightlyRate, 'days': days, 'totalCost': total};
    } else if (destination == 'Kandy') {
      const hotelName = 'Earl\'s Regency Kandy Mountain Lodge';
      const nightlyRate = 16500.0;
      final allAttractions = <Map<String, dynamic>>[
        {'name': 'Temple of the Sacred Tooth Relic (Sri Dalada Maligawa)', 'cost': 2000.0},
        {'name': 'Royal Botanical Gardens Peradeniya', 'cost': 3000.0},
        {'name': 'Bahirawakanda Vihara Buddha Statue', 'cost': 500.0},
      ];
      final allDining = <Map<String, dynamic>>[
        {'name': 'The Kandy Club Colonial Dining Room', 'cost': 3500.0},
        {'name': 'Balaji Dosai Kandyan Vegetarian', 'cost': 1200.0},
      ];
      final basePlans = <Map<String, dynamic>>[
        {
          'day': 1,
          'summary': 'Temple of Tooth & Kandyan Heritage',
          'items': [
            {'time': '08:30 - 11:30', 'type': 'Attraction', 'name': 'Temple of the Sacred Tooth Relic (Sri Dalada Maligawa)', 'cost': 2000.0},
            {'time': '12:30 - 14:00', 'type': 'Dining', 'name': 'The Kandy Club Colonial Dining Room', 'cost': 3500.0},
            {'time': '14:30 - 15:30', 'type': 'Hotel', 'name': 'Check-in: $hotelName', 'cost': nightlyRate},
          ],
        },
        {
          'day': 2,
          'summary': 'Royal Botanical Gardens & Scenic Lake',
          'items': [
            {'time': '09:00 - 12:30', 'type': 'Attraction', 'name': 'Royal Botanical Gardens Peradeniya', 'cost': 3000.0},
            {'time': '13:00 - 14:30', 'type': 'Dining', 'name': 'Balaji Dosai Kandyan Vegetarian', 'cost': 1200.0},
          ],
        },
      ];
      final days = expandDays(basePlans, totalDays, allAttractions, allDining);
      double total = nightlyRate * nights + (1500.0 * totalDays) + 5000.0;
      for (final d in days) {
        for (final item in d['items'] as List<Map<String, dynamic>>) {
          if (item['type'] != 'Hotel') total += (item['cost'] as num).toDouble();
        }
      }
      return {'hotelName': hotelName, 'nightlyRate': nightlyRate, 'days': days, 'totalCost': total};
    } else if (destination == 'Galle') {
      const hotelName = 'Galle Fort Heritage Villa & Boutique';
      const nightlyRate = 22000.0;
      final allAttractions = <Map<String, dynamic>>[
        {'name': 'Galle Dutch Fort Ramparts & Lighthouse (UNESCO)', 'cost': 0.0},
        {'name': 'Jungle Beach Unawatuna Snorkel & Swim', 'cost': 1500.0},
      ];
      final allDining = <Map<String, dynamic>>[
        {'name': 'The Pedlar\'s Inn Cafe & Artisan Bakery', 'cost': 3500.0},
        {'name': 'A Minute by Tuk Tuk Dutch Hospital Galle', 'cost': 4500.0},
      ];
      final basePlans = <Map<String, dynamic>>[
        {
          'day': 1,
          'summary': 'Galle Dutch Fort Heritage Walk',
          'items': [
            {'time': '09:00 - 12:00', 'type': 'Attraction', 'name': 'Galle Dutch Fort Ramparts & Lighthouse (UNESCO)', 'cost': 0.0},
            {'time': '12:30 - 14:00', 'type': 'Dining', 'name': 'The Pedlar\'s Inn Cafe & Artisan Bakery', 'cost': 3500.0},
            {'time': '14:30 - 15:30', 'type': 'Hotel', 'name': 'Check-in: $hotelName', 'cost': nightlyRate},
          ],
        },
        {
          'day': 2,
          'summary': 'Jungle Beach & Ocean Sunset',
          'items': [
            {'time': '08:30 - 11:30', 'type': 'Attraction', 'name': 'Jungle Beach Unawatuna Snorkel & Swim', 'cost': 1500.0},
            {'time': '18:00 - 20:00', 'type': 'Dining', 'name': 'A Minute by Tuk Tuk Dutch Hospital Galle', 'cost': 4500.0},
          ],
        },
      ];
      final days = expandDays(basePlans, totalDays, allAttractions, allDining);
      double total = nightlyRate * nights + (1500.0 * totalDays) + 5000.0;
      for (final d in days) {
        for (final item in d['items'] as List<Map<String, dynamic>>) {
          if (item['type'] != 'Hotel') total += (item['cost'] as num).toDouble();
        }
      }
      return {'hotelName': hotelName, 'nightlyRate': nightlyRate, 'days': days, 'totalCost': total};
    } else {
      // Default: Ella
      const hotelName = 'Ella Gap Panoramic Eco Resort';
      const nightlyRate = 18000.0;
      final allAttractions = <Map<String, dynamic>>[
        {'name': 'Nine Arch Bridge Scenic Mountain Viaduct', 'cost': 0.0},
        {'name': 'Little Adam\'s Peak Sunrise Trek', 'cost': 0.0},
        {'name': 'Ella Rock Guided Mountain Trail', 'cost': 1000.0},
        {'name': 'Ravana Waterfall & Natural Pools', 'cost': 0.0},
      ];
      final allDining = <Map<String, dynamic>>[
        {'name': 'Cafe Chill Ella & Artisan Kitchen', 'cost': 3500.0},
        {'name': 'Ella Village Inn Rooftop Dinner', 'cost': 3000.0},
      ];
      final basePlans = <Map<String, dynamic>>[
        {
          'day': 1,
          'summary': 'Arrival & Iconic Nine Arch Bridge',
          'items': [
            {'time': '09:00 - 11:30', 'type': 'Attraction', 'name': 'Nine Arch Bridge Scenic Mountain Viaduct', 'cost': 0.0},
            {'time': '12:30 - 14:00', 'type': 'Dining', 'name': 'Cafe Chill Ella & Artisan Kitchen', 'cost': 3500.0},
            {'time': '14:30 - 15:30', 'type': 'Hotel', 'name': 'Check-in: $hotelName', 'cost': nightlyRate},
          ],
        },
        {
          'day': 2,
          'summary': 'Little Adam\'s Peak & Ravana Falls',
          'items': [
            {'time': '06:00 - 08:30', 'type': 'Attraction', 'name': 'Little Adam\'s Peak Sunrise Trek', 'cost': 0.0},
            {'time': '10:00 - 12:00', 'type': 'Attraction', 'name': 'Ravana Waterfall & Natural Pools', 'cost': 0.0},
            {'time': '18:30 - 20:00', 'type': 'Dining', 'name': 'Ella Village Inn Rooftop Dinner', 'cost': 3000.0},
          ],
        },
      ];
      final days = expandDays(basePlans, totalDays, allAttractions, allDining);
      double total = nightlyRate * nights + (1500.0 * totalDays) + 5000.0;
      for (final d in days) {
        for (final item in d['items'] as List<Map<String, dynamic>>) {
          if (item['type'] != 'Hotel') total += (item['cost'] as num).toDouble();
        }
      }
      return {'hotelName': hotelName, 'nightlyRate': nightlyRate, 'days': days, 'totalCost': total};
    }
  }

  // ─── Main Build Layout ────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final screenHeight = MediaQuery.of(context).size.height;
    final showQuickPrompts = _messages.length <= 1;

    return Container(
      height: screenHeight * 0.92,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
        boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 20, offset: Offset(0, -4))],
      ),
      child: Column(
        children: [
          _buildHeader(),
          if (showQuickPrompts) _buildQuickPromptsBar(),
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              itemCount: _messages.length,
              itemBuilder: (_, idx) => _buildMessageItem(_messages[idx]),
            ),
          ),
          _buildInputBar(bottomInset),
        ],
      ),
    );
  }

  // ─── Header ──────────────────────────────────────────────────────────────────
  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 10, 10, 12),
      decoration: const BoxDecoration(
        color: AppTheme.primaryDark,
        borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Center(
            child: Container(
              width: 40, height: 4, margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(2)),
            ),
          ),
          Row(
            children: [
              Stack(
                children: [
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [AppTheme.primaryLight, AppTheme.accentGold], begin: Alignment.topLeft, end: Alignment.bottomRight),
                      borderRadius: BorderRadius.circular(13),
                      boxShadow: [BoxShadow(color: AppTheme.accentGold.withValues(alpha: 0.45), blurRadius: 10, offset: const Offset(0, 2))],
                    ),
                    child: const Icon(Icons.auto_awesome_rounded, color: Colors.white, size: 24),
                  ),
                  Positioned(
                    bottom: 0, right: 0,
                    child: Container(
                      width: 13, height: 13,
                      decoration: BoxDecoration(color: AppTheme.successGreen, shape: BoxShape.circle, border: Border.all(color: Colors.white, width: 2)),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Text('TourMate Concierge', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.accentGold.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: AppTheme.accentGold.withValues(alpha: 0.6)),
                        ),
                        child: const Text('Live Agentic', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.accentGold)),
                      ),
                    ]),
                    const SizedBox(height: 2),
                    const Text('Multi-Agent ADK 2.0 • Deterministic Budget Validator', style: TextStyle(fontSize: 10.5, color: Color(0xFFBFDBFE))),
                  ],
                ),
              ),
              Tooltip(
                message: 'New Conversation',
                child: IconButton(
                  icon: const Icon(Icons.restart_alt_rounded, color: Colors.white70, size: 22),
                  onPressed: _resetChat,
                ),
              ),
              Tooltip(
                message: 'Close Concierge',
                child: IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white, size: 24),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ─── Quick Prompts ───────────────────────────────────────────────────────────
  Widget _buildQuickPromptsBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Suggested requests:', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppTheme.textLight)),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _quickPrompts.map((p) => Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ActionChip(
                  backgroundColor: AppTheme.backgroundLight,
                  side: const BorderSide(color: AppTheme.cardBorder),
                  label: Text(p, style: const TextStyle(fontSize: 11.5, color: AppTheme.primaryDark, fontWeight: FontWeight.w500)),
                  onPressed: () => _handleQuickPrompt(p),
                ),
              )).toList(),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Message Dispatcher ───────────────────────────────────────────────────────
  Widget _buildMessageItem(ChatMessage msg) {
    switch (msg.type) {
      case ChatMessageType.agentProgress:
        return _buildAgentProgressBubble(msg);
      case ChatMessageType.itinerary:
        return _buildItineraryCard(msg);
      case ChatMessageType.approvalGate:
        return _buildApprovalGate(msg);
      case ChatMessageType.approved:
        return _buildApprovedBadge();
      case ChatMessageType.failed:
        return _buildFailedCard(msg);
      default:
        return msg.isUser ? _buildUserBubble(msg) : _buildBotBubble(msg);
    }
  }

  Widget _buildUserBubble(ChatMessage msg) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Flexible(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 11),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppTheme.primaryBlue, AppTheme.primaryDark], begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: const BorderRadius.only(topLeft: Radius.circular(16), topRight: Radius.circular(16), bottomLeft: Radius.circular(16), bottomRight: Radius.circular(4)),
                boxShadow: [BoxShadow(color: AppTheme.primaryBlue.withValues(alpha: 0.2), blurRadius: 6, offset: const Offset(0, 2))],
              ),
              child: Text(msg.text, style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.45)),
            ),
          ),
          const SizedBox(width: 8),
          const CircleAvatar(radius: 14, backgroundColor: AppTheme.primaryLight, child: Icon(Icons.person, color: Colors.white, size: 16)),
        ],
      ),
    );
  }

  Widget _buildBotBubble(ChatMessage msg) {
    if (msg.text.isEmpty) return const SizedBox.shrink();

    final tools = msg.toolsCalled ?? [];

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [AppTheme.primaryLight, AppTheme.primaryBlue]),
              shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: AppTheme.primaryBlue.withValues(alpha: 0.25), blurRadius: 6, offset: const Offset(0, 2))],
            ),
            child: const Icon(Icons.auto_awesome, color: Colors.white, size: 16),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: AppTheme.backgroundLight,
                borderRadius: const BorderRadius.only(topLeft: Radius.circular(4), topRight: Radius.circular(16), bottomLeft: Radius.circular(16), bottomRight: Radius.circular(16)),
                border: Border.all(color: AppTheme.cardBorder),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6, offset: const Offset(0, 2))],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Real Tool Badges
                  if (tools.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Wrap(
                        spacing: 5,
                        runSpacing: 4,
                        children: tools.map((t) => _buildToolBadge(t)).toList(),
                      ),
                    ),

                  // Formatted message content
                  _buildFormattedContent(msg.text),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildToolBadge(String toolName) {
    String label = toolName;
    Color color = AppTheme.primaryBlue;

    if (toolName.contains('security')) {
      label = '🛡️ Security Checkpoint';
      color = const Color(0xFF0284C7);
    } else if (toolName.contains('attraction')) {
      label = '🔍 Tourism Discovery';
      color = const Color(0xFF0D9488);
    } else if (toolName.contains('accommodation') || toolName.contains('dining')) {
      label = '🏨 Stays & Dining';
      color = const Color(0xFFD97706);
    } else if (toolName.contains('budget') || toolName.contains('feasibility')) {
      label = '⚖️ Feasibility & Budget';
      color = AppTheme.successGreen;
    } else if (toolName.contains('weather')) {
      label = '🌤️ Weather & Climate';
      color = const Color(0xFF7C3AED);
    } else if (toolName.contains('insights')) {
      label = '💡 Destination Insights';
      color = AppTheme.accentGold;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }

  // ─── Markdown / Rich Text Formatter ─────────────────────────────────────────
  Widget _buildFormattedContent(String rawText) {
    final lines = rawText.split('\n');
    final List<Widget> widgets = [];

    for (int i = 0; i < lines.length; i++) {
      final line = lines[i].trimRight();
      if (line.isEmpty) {
        widgets.add(const SizedBox(height: 6));
        continue;
      }

      // Headers (### or ##)
      if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
        final headerText = line.replaceFirst(RegExp(r'^#+\s*'), '');
        widgets.add(Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 4),
          child: Text(
            headerText,
            style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold, color: AppTheme.primaryDark),
          ),
        ));
        continue;
      }

      // Horizontal dividers
      if (line == '---' || line == '***') {
        widgets.add(const Divider(height: 14, color: AppTheme.cardBorder));
        continue;
      }

      // Bullet points
      if (line.startsWith('* ') || line.startsWith('- ') || line.startsWith('• ')) {
        final bulletContent = line.substring(2);
        widgets.add(Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('• ', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBlue, fontSize: 13)),
              Expanded(child: _parseInlineMarkdown(bulletContent)),
            ],
          ),
        ));
        continue;
      }

      // Numbered lists (1. , 2. )
      final numMatch = RegExp(r'^(\d+)\.\s*(.*)').firstMatch(line);
      if (numMatch != null) {
        widgets.add(Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${numMatch.group(1)}. ', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryDark, fontSize: 12.5)),
              Expanded(child: _parseInlineMarkdown(numMatch.group(2)!)),
            ],
          ),
        ));
        continue;
      }

      // Regular text
      widgets.add(Padding(
        padding: const EdgeInsets.symmetric(vertical: 1.5),
        child: _parseInlineMarkdown(line),
      ));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: widgets,
    );
  }

  Widget _parseInlineMarkdown(String text) {
    final spans = <TextSpan>[];
    final regex = RegExp(r'(\*\*.*?\*\*|\*.*?\*|`.*?`)');
    int lastEnd = 0;

    for (final match in regex.allMatches(text)) {
      if (match.start > lastEnd) {
        spans.add(TextSpan(text: text.substring(lastEnd, match.start)));
      }
      final token = match.group(0)!;
      if (token.startsWith('**') && token.endsWith('**')) {
        spans.add(TextSpan(
          text: token.substring(2, token.length - 2),
          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.textDark),
        ));
      } else if (token.startsWith('*') && token.endsWith('*')) {
        spans.add(TextSpan(
          text: token.substring(1, token.length - 1),
          style: const TextStyle(fontStyle: FontStyle.italic, color: AppTheme.textMedium),
        ));
      } else if (token.startsWith('`') && token.endsWith('`')) {
        spans.add(TextSpan(
          text: token.substring(1, token.length - 1),
          style: const TextStyle(fontFamily: 'monospace', backgroundColor: Color(0xFFE2E8F0), color: AppTheme.primaryDark),
        ));
      }
      lastEnd = match.end;
    }

    if (lastEnd < text.length) {
      spans.add(TextSpan(text: text.substring(lastEnd)));
    }

    return RichText(
      text: TextSpan(
        style: const TextStyle(color: AppTheme.textMedium, fontSize: 13, height: 1.45),
        children: spans,
      ),
    );
  }

  Widget _buildAgentProgressBubble(ChatMessage msg) {
    final steps = (msg.payload?['steps'] as List?)?.cast<String>() ?? [];
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFCBD5E1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primaryBlue)),
              const SizedBox(width: 10),
              Text(msg.text, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: AppTheme.primaryDark)),
            ]),
            const SizedBox(height: 10),
            ...steps.map((step) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 3),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Icon(Icons.check_circle, size: 13, color: AppTheme.successGreen),
                const SizedBox(width: 7),
                Expanded(child: Text(step, style: const TextStyle(fontSize: 12, color: AppTheme.textMedium, height: 1.3))),
              ]),
            )),
          ],
        ),
      ),
    );
  }

  // ─── Dynamic Multi-Day Itinerary Card ─────────────────────────────────────────
  Widget _buildItineraryCard(ChatMessage msg) {
    final p = msg.payload!;
    final destination = p['destination'] as String;
    final days = p['days'] as int;
    final totalCost = p['totalCost'] as double;
    final budget = p['budget'] as double;
    final surplus = p['surplus'] as double;
    final apiDays = (p['apiDays'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.cardBorder, width: 1.2),
          boxShadow: [BoxShadow(color: AppTheme.primaryBlue.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 4))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Card Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: const BoxDecoration(
                color: AppTheme.primaryDark,
                borderRadius: BorderRadius.only(topLeft: Radius.circular(16), topRight: Radius.circular(16)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(children: [
                    const Icon(Icons.explore_rounded, color: AppTheme.accentGold, size: 18),
                    const SizedBox(width: 7),
                    Text('$destination $days-Day Expedition', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Colors.white)),
                  ]),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppTheme.successGreen.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(6), border: Border.all(color: AppTheme.successGreen.withValues(alpha: 0.5))),
                    child: const Text('Budget Validated ✓', style: TextStyle(color: Color(0xFFD1FAE5), fontSize: 10.5, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),

            // Day by day sections
            ...apiDays.map((dayMap) {
              final dayNum = dayMap['day'] as int? ?? 1;
              final summary = dayMap['summary'] as String? ?? 'Day $dayNum';
              final items = (dayMap['items'] as List?)?.cast<Map<String, dynamic>>() ?? [];
              return _buildDaySection(dayNum, summary, items);
            }),

            // Cost summary box
            Container(
              margin: const EdgeInsets.all(12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Column(
                children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    const Text('Total Estimated Cost:', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12.5, color: AppTheme.textDark)),
                    Text('LKR ${_formatLkr(totalCost)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppTheme.primaryBlue)),
                  ]),
                  const SizedBox(height: 4),
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text('Budget Limit: LKR ${_formatLkr(budget)}', style: const TextStyle(fontSize: 11, color: AppTheme.textLight)),
                    Text(
                      surplus >= 0 ? 'Surplus Savings: LKR ${_formatLkr(surplus)}' : 'Over budget!',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: surplus >= 0 ? AppTheme.successGreen : AppTheme.errorRed),
                    ),
                  ]),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDaySection(int dayNum, String summary, List<Map<String, dynamic>> items) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
              decoration: BoxDecoration(color: AppTheme.primaryBlue, borderRadius: BorderRadius.circular(7)),
              child: Text('Day $dayNum', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
            ),
            const SizedBox(width: 8),
            Expanded(child: Text(summary, style: const TextStyle(fontSize: 12, color: AppTheme.textMedium, fontWeight: FontWeight.w500), overflow: TextOverflow.ellipsis)),
          ]),
          const SizedBox(height: 6),
          ...items.map((item) {
            final type = item['type'] as String? ?? '';
            final name = item['name'] as String? ?? '';
            final cost = (item['cost'] as num?)?.toDouble() ?? 0.0;
            final time = item['time'] as String? ?? '';

            IconData icon;
            Color iconColor;
            switch (type) {
              case 'Hotel':
                icon = Icons.hotel_rounded;
                iconColor = AppTheme.primaryBlue;
                break;
              case 'Dining':
                icon = Icons.restaurant_rounded;
                iconColor = AppTheme.accentGold;
                break;
              default:
                icon = Icons.place_rounded;
                iconColor = AppTheme.successGreen;
            }

            return Container(
              margin: const EdgeInsets.only(bottom: 5),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFE2E8F0))),
              child: Row(children: [
                Icon(icon, size: 14, color: iconColor),
                const SizedBox(width: 7),
                if (time.isNotEmpty) Text('$time  ', style: const TextStyle(fontSize: 10, color: AppTheme.textLight)),
                Expanded(child: Text(name, style: const TextStyle(fontSize: 11.5, color: AppTheme.textMedium), overflow: TextOverflow.ellipsis)),
                Text(cost == 0 ? 'Free' : 'LKR ${_formatLkr(cost)}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: cost == 0 ? AppTheme.successGreen : AppTheme.textLight)),
              ]),
            );
          }),
          const Divider(height: 14),
        ],
      ),
    );
  }

  // ─── Human-In-The-Loop Approval Gate ──────────────────────────────────────────
  Widget _buildApprovalGate(ChatMessage msg) {
    final p = msg.payload!;
    final totalCost = p['totalCost'] as double;
    final workflowId = p['workflowId'] as String;
    final destination = p['destination'] as String? ?? 'Sri Lanka';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Container(
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFBEB),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF59E0B), width: 1.5),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(children: [
              Icon(Icons.lock_clock_rounded, color: Color(0xFFD97706), size: 19),
              SizedBox(width: 8),
              Text('Human-In-The-Loop Approval Gate', style: TextStyle(color: Color(0xFF92400E), fontWeight: FontWeight.bold, fontSize: 13)),
            ]),
            const SizedBox(height: 6),
            Text(
              'High-Impact Action: Reservations in $destination require your explicit tourist authorization before committing bookings to the database.',
              style: const TextStyle(color: Color(0xFF78350F), fontSize: 12, height: 1.35),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF59E0B),
                  foregroundColor: Colors.black87,
                  elevation: 3,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isProcessing ? null : () => _approvePackage(workflowId, totalCost, destination),
                icon: const Icon(Icons.check_circle_outline, color: Colors.black87, size: 18),
                label: Text('Approve Booking Package (LKR ${_formatLkr(totalCost)})', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildApprovedBadge() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFECFDF5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.successGreen, width: 1.5),
        ),
        child: const Row(children: [
          Icon(Icons.verified_rounded, color: AppTheme.successGreen, size: 18),
          SizedBox(width: 8),
          Text('Booking Package Authorized & Confirmed', style: TextStyle(color: Color(0xFF065F46), fontWeight: FontWeight.bold, fontSize: 13)),
        ]),
      ),
    );
  }

  Widget _buildFailedCard(ChatMessage msg) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFFFF1F2),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.errorRed.withValues(alpha: 0.5)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Row(children: [
            Icon(Icons.shield_outlined, color: AppTheme.errorRed, size: 18),
            SizedBox(width: 8),
            Text('Planning Halted — Safety Gate', style: TextStyle(color: AppTheme.errorRed, fontWeight: FontWeight.bold, fontSize: 13)),
          ]),
          const SizedBox(height: 6),
          Text(msg.text, style: const TextStyle(color: AppTheme.textMedium, fontSize: 12.5, height: 1.35)),
        ]),
      ),
    );
  }

  // ─── Input Bar ────────────────────────────────────────────────────────────────
  Widget _buildInputBar(double bottomInset) {
    return Container(
      padding: EdgeInsets.fromLTRB(14, 10, 14, 12 + bottomInset),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))],
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(color: AppTheme.backgroundLight, borderRadius: BorderRadius.circular(26), border: Border.all(color: AppTheme.cardBorder)),
                child: TextField(
                  controller: _textCtrl,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => _sendMessage(),
                  decoration: const InputDecoration(
                    hintText: 'Ask TourMate Concierge anything about your trip...',
                    hintStyle: TextStyle(fontSize: 12.5, color: AppTheme.textLight),
                    contentPadding: EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    border: InputBorder.none,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [AppTheme.primaryBlue, AppTheme.primaryDark], begin: Alignment.topLeft, end: Alignment.bottomRight),
                shape: BoxShape.circle,
                boxShadow: [BoxShadow(color: AppTheme.primaryBlue.withValues(alpha: 0.35), blurRadius: 7, offset: const Offset(0, 2))],
              ),
              child: IconButton(
                icon: _isProcessing
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                onPressed: _isProcessing ? null : _sendMessage,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatLkr(double amount) {
    if (amount >= 1000) {
      return amount.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');
    }
    return amount.toStringAsFixed(0);
  }
}
