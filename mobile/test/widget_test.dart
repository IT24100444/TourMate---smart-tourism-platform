import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tourmate_mobile/app/app.dart';
import 'package:tourmate_mobile/core/theme/app_theme.dart';
import 'package:tourmate_mobile/features/trips/ai_concierge_sheet.dart';

void main() {
  testWidgets('TourMate App Boots up on Splash', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(const TourMateApp());
    expect(find.text('TourMate'), findsOneWidget);
    expect(find.text('Discover Paradise Island'), findsOneWidget);
    await tester.pump(const Duration(milliseconds: 3000));
  });

  testWidgets('MainScaffold renders with 4 tabs and Floating AI Concierge button', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const MainScaffold(),
      ),
    );

    // Verify app bar title
    expect(find.text('TourMate'), findsOneWidget);
    expect(find.text('Sri Lanka Travels'), findsOneWidget);

    // Verify 4 bottom nav items
    expect(find.text('Explore'), findsOneWidget);
    expect(find.text('Stay & Dine'), findsOneWidget);
    expect(find.text('Bookings'), findsOneWidget);
    expect(find.text('Reviews'), findsOneWidget);

    // Verify AI Planner tab is removed from bottom bar
    expect(find.text('AI Planner'), findsNothing);

    // Verify Floating AI Concierge action button is present
    expect(find.text('AI Concierge'), findsOneWidget);
    expect(find.byType(FloatingActionButton), findsOneWidget);

    // Tap Floating AI Concierge button to open interactive chat
    await tester.tap(find.byType(FloatingActionButton));
    await tester.pumpAndSettle();

    // Verify Agentic Concierge Bottom Sheet opened
    expect(find.text('TourMate Concierge'), findsOneWidget);
    expect(find.text('Live Agentic'), findsOneWidget);
    expect(find.text('Suggested requests:'), findsOneWidget);

    // Close the concierge sheet using the close ('X') icon
    final closeButtonFinder = find.byTooltip('Close Concierge');
    expect(closeButtonFinder, findsOneWidget);
    await tester.tap(closeButtonFinder);
    await tester.pumpAndSettle();

    // Verify sheet is closed
    expect(find.text('TourMate Concierge'), findsNothing);
  });

  testWidgets('Agentic AI Concierge plans Ella trip and confirms Tourist Approval Gate in chat', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const Scaffold(
          body: AIConciergeSheet(),
        ),
      ),
    );

    // Tap prompt chip for Ella trip
    final promptChip = find.text('🌲 Plan 2-day Ella trip – LKR 40,000');
    expect(promptChip, findsOneWidget);
    await tester.tap(promptChip);
    await tester.pump();

    // Fast-forward through multi-agent collaboration steps
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pumpAndSettle();

    // Verify Itinerary card is for Ella
    expect(find.text('Ella 2-Day Expedition'), findsOneWidget);
    expect(find.text('Human-In-The-Loop Approval Gate'), findsOneWidget);
    expect(find.text('Budget Validated ✓'), findsOneWidget);
    expect(find.textContaining('Approve Booking Package'), findsOneWidget);

    // Tap to give tourist approval
    await tester.tap(find.textContaining('Approve Booking Package'));
    await tester.pumpAndSettle();

    // Verify that status shifted to Authorized & Confirmed
    expect(find.text('Booking Package Authorized & Confirmed'), findsOneWidget);
    expect(find.textContaining('Booking Package Authorized'), findsWidgets);
  });

  testWidgets('Agentic AI Concierge correctly plans Sigiriya 5-day trip when user types "i want to go sigiriya 5 dat trip"', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const Scaffold(
          body: AIConciergeSheet(),
        ),
      ),
    );

    // Type the exact user inquiry into the text field
    final inputFinder = find.byType(TextField);
    expect(inputFinder, findsOneWidget);
    await tester.enterText(inputFinder, 'i want to go sigiriya 5 dat trip');

    // Tap send button
    final sendButtonFinder = find.byIcon(Icons.send_rounded);
    expect(sendButtonFinder, findsOneWidget);
    await tester.tap(sendButtonFinder);
    await tester.pump();

    // Fast-forward through multi-agent collaboration steps
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pumpAndSettle();

    // Verify that it planned for SIGIRIYA and for 5 DAYS (NOT 2-day Ella!)
    expect(find.text('Sigiriya 5-Day Expedition'), findsOneWidget);
    expect(find.text('Day 1'), findsOneWidget);
    expect(find.text('Day 5'), findsOneWidget);
    expect(find.textContaining('Sigiriya Ancient Lion Rock'), findsWidgets);
    expect(find.text('Human-In-The-Loop Approval Gate'), findsOneWidget);

    // Tourist confirms approval
    await tester.tap(find.textContaining('Approve Booking Package'));
    await tester.pumpAndSettle();

    // Verify confirmation
    expect(find.text('Booking Package Authorized & Confirmed'), findsOneWidget);
    expect(find.textContaining('Booking Package Authorized'), findsWidgets);
  });

  testWidgets('AppBar Agentic AI Trip Planner button opens AITripPlannerScreen with yellow approval button', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 1920);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() => tester.view.resetPhysicalSize());

    // Render MainScaffold directly (skip splash/login routing)
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const MainScaffold(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify AppBar has AI Trip Planner icon button
    final aiPlannerButton = find.byTooltip('Agentic AI Trip Planner');
    expect(aiPlannerButton, findsOneWidget);

    // Tap to open AITripPlannerScreen
    await tester.tap(aiPlannerButton);
    await tester.pumpAndSettle();

    // Verify AITripPlannerScreen is displayed
    expect(find.text('Agentic AI Trip Planner'), findsOneWidget);
    expect(find.text('Component D (Member 4)'), findsOneWidget);

    // Tap Run Multi-Agent Planner button
    final genBtn = find.text('Run Multi-Agent Planner');
    expect(genBtn, findsOneWidget);
    await tester.tap(genBtn);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 1500));
    await tester.pumpAndSettle();

    // Verify Human-In-The-Loop Approval Gate is shown with yellow Approve button
    expect(find.text('Human-In-The-Loop Approval Gate'), findsOneWidget);
    expect(find.textContaining('Approve'), findsAtLeastNWidgets(1));

    // Tourist taps the yellow Approve button (label contains 'Approve Booking Package')
    final approveBtn = find.widgetWithText(ElevatedButton, 'Approve Booking Package').evaluate().isEmpty
        ? find.textContaining('Approve Booking Package')
        : find.widgetWithText(ElevatedButton, 'Approve Booking Package');
    await tester.tap(approveBtn.first);
    await tester.pumpAndSettle();

    // Verify booking is now confirmed
    expect(find.text('Booking Package Authorized & Confirmed'), findsOneWidget);
  });
}
