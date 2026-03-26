import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import { Shield, User, Mail, Lock, ChevronRight, Users, AlertCircle, Building2 } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuthStore, useMemberStore, type Flight, type Squadron, type User as UserType, getDisplayName, SQUADRONS } from '@/lib/store';
import { cn } from '@/lib/cn';

const FLIGHTS: Flight[] = ['Apex', 'Bomber', 'Cryptid', 'Doom', 'Ewok', 'Foxhound', 'ADF', 'DET'];
const RANKS = ['AB', 'Amn', 'A1C', 'SrA', 'SSgt', 'TSgt', 'MSgt', 'SMSgt', 'CMSgt'];

// Owner credentials
const OWNER_EMAIL = 'benjamin.broadhead.2@us.af.mil';
const OWNER_PASSWORD = 'Estoc#73';

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore(s => s.login);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const hasCheckedAuth = useAuthStore(s => s.hasCheckedAuth);
  const members = useMemberStore(s => s.members);
  const addMember = useMemberStore(s => s.addMember);
  const addNotification = useMemberStore(s => s.addNotification);
  const attendanceRecords = useMemberStore(s => s.attendanceRecords);

  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedFlight, setSelectedFlight] = useState<Flight>('Apex');
  const [selectedSquadron, setSelectedSquadron] = useState<Squadron>('392 IS');
  const [selectedRank, setSelectedRank] = useState('A1C');
  const [wantsPTL, setWantsPTL] = useState(false);
  const [error, setError] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [matchingAttendance, setMatchingAttendance] = useState<typeof attendanceRecords[0] | null>(null);

  // Redirect if already authenticated
  if (isAuthenticated && hasCheckedAuth) {
    return <Redirect href="/(tabs)" />;
  }

  // Show loading while checking auth
  if (!hasCheckedAuth) {
    return (
      <View className="flex-1 bg-af-navy items-center justify-center">
        <Shield size={48} color="#4A90D9" />
      </View>
    );
  }

  const validateEmail = (emailToValidate: string): boolean => {
    return emailToValidate.toLowerCase().endsWith('@us.af.mil');
  };

  const handleSignIn = () => {
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    // Check for owner login
    if (email.toLowerCase() === OWNER_EMAIL.toLowerCase() && password === OWNER_PASSWORD) {
      const owner = members.find(m => m.email.toLowerCase() === OWNER_EMAIL.toLowerCase());
      if (owner) {
        const user: UserType = {
          id: owner.id,
          rank: owner.rank,
          firstName: owner.firstName,
          lastName: owner.lastName,
          flight: owner.flight,
          squadron: owner.squadron,
          accountType: owner.accountType,
          email: owner.email,
          isVerified: true,
          ptlPendingApproval: false,
          fitnessAssessmentsPrivate: false,
        };
        login(user);
        router.replace('/(tabs)');
        return;
      }
    }

    // Check for existing member login
    const member = members.find(m => m.email.toLowerCase() === email.toLowerCase());
    if (member) {
      // For demo, accept any password for existing members
      const user: UserType = {
        id: member.id,
        rank: member.rank,
        firstName: member.firstName,
        lastName: member.lastName,
        flight: member.flight,
        squadron: member.squadron,
        accountType: member.accountType,
        email: member.email,
        isVerified: member.isVerified,
        ptlPendingApproval: member.ptlPendingApproval,
        fitnessAssessmentsPrivate: false,
      };
      login(user);
      router.replace('/(tabs)');
    } else {
      setError('Invalid email or password');
    }
  };

  const handleSignUp = () => {
    setError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your full name');
      return;
    }

    if (!validateEmail(email)) {
      setError('Email must end with @us.af.mil');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    // Check if email already exists
    const existingMember = members.find(m => m.email.toLowerCase() === email.toLowerCase());
    if (existingMember) {
      setError('An account with this email already exists');
      return;
    }

    // Check for matching attendance record
    const matching = attendanceRecords.find(
      r => r.firstName.toLowerCase() === firstName.toLowerCase() &&
           r.lastName.toLowerCase() === lastName.toLowerCase()
    );

    if (matching) {
      setMatchingAttendance(matching);
      setShowLinkModal(true);
      return;
    }

    createAccount(null);
  };

  const createAccount = (linkedAttendanceId: string | null) => {
    const newMemberId = Date.now().toString();

    // Create the member
    const newMember = {
      id: newMemberId,
      rank: selectedRank,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      flight: selectedFlight,
      squadron: selectedSquadron,
      accountType: wantsPTL ? 'standard' as const : 'standard' as const, // PTL needs approval
      email: email.toLowerCase(),
      exerciseMinutes: 0,
      distanceRun: 0,
      caloriesBurned: 0,
      connectedApps: [] as string[],
      fitnessAssessments: [],
      workouts: [],
      achievements: [] as string[],
      requiredPTSessionsPerWeek: 3,
      isVerified: true, // For now, auto-verify (no email service)
      ptlPendingApproval: wantsPTL,
      linkedAttendanceId: linkedAttendanceId ?? undefined,
      monthlyPlacements: [],
      trophyCount: 0,
    };

    addMember(newMember);

    // If requesting PTL, notify owner and UFPM
    if (wantsPTL) {
      addNotification({
        type: 'ptl_request',
        title: 'PTL Request',
        message: `${selectedRank} ${firstName} ${lastName} signed up as a PTL. Open the app to authorize or reject.`,
        data: { memberId: newMemberId },
      });
    }

    // Log in the new user
    const user: UserType = {
      id: newMemberId,
      rank: selectedRank,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      flight: selectedFlight,
      squadron: selectedSquadron,
      accountType: 'standard',
      email: email.toLowerCase(),
      isVerified: true,
      ptlPendingApproval: wantsPTL,
      fitnessAssessmentsPrivate: false,
      hasSeenTutorial: false, // New users haven't seen tutorial
    };

    login(user);
    setShowLinkModal(false);
    router.replace('/welcome'); // Redirect to tutorial for new users
  };

  const handleSubmit = () => {
    if (isSignUp) {
      handleSignUp();
    } else {
      handleSignIn();
    }
  };

  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#0A1628', '#00308F', '#1E4FAD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Section */}
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              className="items-center mb-8"
            >
              <View className="w-20 h-20 bg-white/10 rounded-full items-center justify-center mb-4 border border-white/20">
                <Shield size={40} color="#C0C0C0" />
              </View>
              <Text className="text-3xl font-bold text-white">FitFlight</Text>
              <Text className="text-af-silver text-base mt-1">Squadron PT Tracker and Fitness Tool</Text>
            </Animated.View>

            {/* Form Card */}
            <Animated.View
              entering={FadeInUp.delay(200).springify()}
              className="bg-white/10 rounded-3xl p-6 border border-white/20"
            >
              {/* Toggle Login/Sign Up */}
              <View className="flex-row bg-white/10 rounded-2xl p-1 mb-6">
                <Pressable
                  onPress={() => { setIsSignUp(false); setError(''); Haptics.selectionAsync(); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl",
                    !isSignUp && "bg-af-blue"
                  )}
                >
                  <Text className={cn(
                    "text-center font-semibold",
                    !isSignUp ? "text-white" : "text-white/60"
                  )}>Sign In</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setIsSignUp(true); setError(''); Haptics.selectionAsync(); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl",
                    isSignUp && "bg-af-blue"
                  )}
                >
                  <Text className={cn(
                    "text-center font-semibold",
                    isSignUp ? "text-white" : "text-white/60"
                  )}>Sign Up</Text>
                </Pressable>
              </View>

              {/* Error Message */}
              {error ? (
                <View className="flex-row items-center bg-red-500/20 border border-red-500/50 rounded-xl px-4 py-3 mb-4">
                  <AlertCircle size={18} color="#EF4444" />
                  <Text className="text-red-400 ml-2 flex-1">{error}</Text>
                </View>
              ) : null}

              {isSignUp && (
                <>
                  {/* First Name Input */}
                  <View className="mb-4">
                    <Text className="text-white/60 text-sm mb-2 ml-1">First Name</Text>
                    <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                      <User size={20} color="#C0C0C0" />
                      <TextInput
                        placeholder="First Name"
                        placeholderTextColor="#ffffff40"
                        value={firstName}
                        onChangeText={setFirstName}
                        className="flex-1 ml-3 text-white text-base"
                      />
                    </View>
                  </View>

                  {/* Last Name Input */}
                  <View className="mb-4">
                    <Text className="text-white/60 text-sm mb-2 ml-1">Last Name</Text>
                    <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                      <User size={20} color="#C0C0C0" />
                      <TextInput
                        placeholder="Last Name"
                        placeholderTextColor="#ffffff40"
                        value={lastName}
                        onChangeText={setLastName}
                        className="flex-1 ml-3 text-white text-base"
                      />
                    </View>
                  </View>

                  {/* Rank Selection */}
                  <View className="mb-4">
                    <Text className="text-white/60 text-sm mb-2 ml-1">Rank</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ flexGrow: 0 }}
                    >
                      <View className="flex-row space-x-2">
                        {RANKS.map((rank) => (
                          <Pressable
                            key={rank}
                            onPress={() => { setSelectedRank(rank); Haptics.selectionAsync(); }}
                            className={cn(
                              "px-4 py-2 rounded-lg border mr-2",
                              selectedRank === rank
                                ? "bg-af-accent border-af-accent"
                                : "bg-white/5 border-white/10"
                            )}
                          >
                            <Text className={cn(
                              "text-sm font-medium",
                              selectedRank === rank ? "text-white" : "text-white/70"
                            )}>{rank}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Flight Selection */}
                  <View className="mb-4">
                    <Text className="text-white/60 text-sm mb-2 ml-1">Flight</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ flexGrow: 0 }}
                    >
                      <View className="flex-row">
                        {FLIGHTS.map((flight) => (
                          <Pressable
                            key={flight}
                            onPress={() => { setSelectedFlight(flight); Haptics.selectionAsync(); }}
                            className={cn(
                              "px-4 py-2 rounded-lg border mr-2",
                              selectedFlight === flight
                                ? "bg-af-accent border-af-accent"
                                : "bg-white/5 border-white/10"
                            )}
                          >
                            <Text className={cn(
                              "text-sm font-medium",
                              selectedFlight === flight ? "text-white" : "text-white/70"
                            )}>{flight}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  </View>

                  {/* Squadron Selection */}
                  <View className="mb-4">
                    <Text className="text-white/60 text-sm mb-2 ml-1">Squadron</Text>
                    <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                      <Building2 size={20} color="#C0C0C0" />
                      <View className="flex-1 ml-3">
                        {SQUADRONS.map((squadron) => (
                          <Pressable
                            key={squadron}
                            onPress={() => { setSelectedSquadron(squadron); Haptics.selectionAsync(); }}
                            className={cn(
                              "py-2",
                              selectedSquadron === squadron && "bg-af-accent/20 rounded-lg px-2 -mx-2"
                            )}
                          >
                            <Text className={cn(
                              "font-medium",
                              selectedSquadron === squadron ? "text-white" : "text-white/70"
                            )}>{squadron}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* PTL Toggle */}
                  <Pressable
                    onPress={() => { setWantsPTL(!wantsPTL); Haptics.selectionAsync(); }}
                    className={cn(
                      "flex-row items-center justify-between p-4 rounded-xl mb-4 border",
                      wantsPTL ? "bg-af-gold/20 border-af-gold/50" : "bg-white/5 border-white/10"
                    )}
                  >
                    <View className="flex-row items-center flex-1">
                      <Users size={20} color={wantsPTL ? "#FFD700" : "#C0C0C0"} />
                      <View className="ml-3 flex-1">
                        <Text className={cn(
                          "font-medium",
                          wantsPTL ? "text-af-gold" : "text-white/70"
                        )}>Request PTL Status</Text>
                        <Text className="text-white/40 text-xs">Requires approval from Owner/UFPM</Text>
                      </View>
                    </View>
                    <View className={cn(
                      "w-6 h-6 rounded-full border-2",
                      wantsPTL ? "bg-af-gold border-af-gold" : "border-white/30"
                    )}>
                      {wantsPTL && <View className="flex-1 items-center justify-center">
                        <View className="w-2 h-2 bg-af-navy rounded-full" />
                      </View>}
                    </View>
                  </Pressable>
                </>
              )}

              {/* Email Input */}
              <View className="mb-4">
                <Text className="text-white/60 text-sm mb-2 ml-1">Email</Text>
                <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                  <Mail size={20} color="#C0C0C0" />
                  <TextInput
                    placeholder="you@us.af.mil"
                    placeholderTextColor="#ffffff40"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 ml-3 text-white text-base"
                  />
                </View>
                {isSignUp && (
                  <Text className="text-white/40 text-xs mt-1 ml-1">Must be a @us.af.mil email</Text>
                )}
              </View>

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-white/60 text-sm mb-2 ml-1">Password</Text>
                <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3 border border-white/10">
                  <Lock size={20} color="#C0C0C0" />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor="#ffffff40"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    className="flex-1 ml-3 text-white text-base"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit}
                className="bg-af-accent py-4 rounded-xl flex-row items-center justify-center active:opacity-80"
              >
                <Text className="text-white font-bold text-lg mr-2">
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
                <ChevronRight size={20} color="white" />
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Link Attendance Modal */}
      <Modal visible={showLinkModal} transparent animationType="fade">
        <View className="flex-1 bg-black/80 items-center justify-center p-6">
          <View className="bg-af-navy rounded-3xl p-6 w-full max-w-sm border border-white/20">
            <Text className="text-white text-xl font-bold mb-4">Existing PT Records Found</Text>
            <Text className="text-af-silver mb-6">
              We found PT attendance records for {matchingAttendance?.rank} {matchingAttendance?.firstName} {matchingAttendance?.lastName}.
              Would you like to link these records to your new account?
            </Text>
            <View className="flex-row space-x-3">
              <Pressable
                onPress={() => createAccount(null)}
                className="flex-1 bg-white/10 py-3 rounded-xl mr-2"
              >
                <Text className="text-white text-center font-semibold">No Thanks</Text>
              </Pressable>
              <Pressable
                onPress={() => createAccount(matchingAttendance?.id ?? null)}
                className="flex-1 bg-af-accent py-3 rounded-xl ml-2"
              >
                <Text className="text-white text-center font-semibold">Link Records</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
