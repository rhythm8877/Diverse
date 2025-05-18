import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useUser } from '../context/UserContext';
import { getBottomSpacing, IS_TABLET, responsiveDimension, scaledFontSize } from '../utils/responsive';
import { COLORS, SHADOWS } from '../utils/theme';
import Header from './Header';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';

const { width } = Dimensions.get('window');
const cardWidth = width - 32;
const imageHeight = IS_TABLET ? 200 : 160;

const carouselImages = [
  require('../assets/cards.png'),
  require('../assets/cards.png'),
  require('../assets/cards.png'),
];

// For infinite loop, add first and last images at the ends
const infiniteCarouselImages = [
  carouselImages[carouselImages.length - 1],
  ...carouselImages,
  carouselImages[0],
];

const GUEST_ICON = (
  <Ionicons name="person-circle-outline" size={40} color={COLORS.primary} />
);

const USER_ICON = (
  <MaterialIcons name="person" size={40} color={COLORS.primary} />
);

const WAVE_ICON = (
  <Text style={{ fontSize: 24, marginLeft: 4 }}>👋</Text>
);

const EVENT_ICON = (
  <MaterialIcons name="event" size={22} color={COLORS.primary} style={{ marginRight: 8 }} />
);

const HomeScreen = ({ navigation }) => {
  const { userData, isLoggedIn, isOnline } = useUser();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const flatListRef = useRef();
  const [carouselIndex, setCarouselIndex] = useState(1); // Start at 1 (first real image)
  const carouselTimer = useRef(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const isMounted = useRef(true);
  const profileImageUrl = userData?.profileImageUrl || null;

  // Force redirect to login if not authenticated
  useEffect(() => {
    if (!isLoggedIn) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [isLoggedIn, navigation]);

  // Get user's first name for greeting
  const getUserGreeting = () => {
    if (!isLoggedIn || !userData) return 'User';
    
    // Try to get the user's name from userData
    const fullName = userData.name || '';
    if (fullName.trim() === '') return 'User';
    
    // Extract the first name from the full name
    const firstName = fullName.split(' ')[0];
    return firstName;
  };

  // Prefetch profile image if available
  useEffect(() => {
    if (userData) {
      setImageLoading(true); // Reset loading state when userData changes
      setImageError(false); // Reset error state
      
      if (userData.profileImageUrl && Platform.OS !== 'web') {
        try {
          Image.prefetch(userData.profileImageUrl)
            .then(() => {
              setImageLoading(false);
            })
            .catch(error => {
              setImageLoading(false);
              setImageError(true);
            });
        } catch (error) {
          setImageLoading(false);
          setImageError(true);
        }
      } else {
        setImageLoading(false);
      }
    }
  }, [userData?.profileImageUrl]);

  const onViewRef = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCarouselIndex(viewableItems[0].index);
    }
  });
  
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 50 });

  // Component lifecycle management
  useEffect(() => {
    isMounted.current = true;
    startAutoScroll();
    
    return () => {
      isMounted.current = false;
      stopAutoScroll();
    };
  }, []);

  // Make sure flatList is ready before trying to scroll
  useEffect(() => {
    // Schedule initial scroll after component is fully rendered
    const timer = setTimeout(() => {
      if (flatListRef.current && carouselIndex !== null) {
        try {
          flatListRef.current.scrollToIndex({ 
            index: carouselIndex, 
            animated: true,
            viewPosition: 0.5
          });
        } catch (err) {
          // Handle initial scroll error silently
        }
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Handle auto-scrolling behavior
  useEffect(() => {
    if (isAutoScrolling && isMounted.current) {
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
    
    return () => stopAutoScroll();
  }, [isAutoScrolling, carouselIndex]);

  // Handle seamless looping with safeguards for Android
  const handleMomentumScrollEnd = (event) => {
    if (!isMounted.current) return;
    
    try {
      if (carouselIndex === 0) {
        // If swiped to the fake first (last image), jump to real last
        const newIndex = infiniteCarouselImages.length - 2;
        
        // Use longer timeout to prevent blinking during transition
        setTimeout(() => {
          if (flatListRef.current && isMounted.current) {
            // Set index first to avoid state update during scrolling
            setCarouselIndex(newIndex);
            
            // Use requestAnimationFrame for smoother transition
            requestAnimationFrame(() => {
              if (flatListRef.current && isMounted.current) {
                flatListRef.current.scrollToIndex({ 
                  index: newIndex, 
                  animated: false,
                  viewPosition: 0.5
                });
              }
            });
          }
        }, 100);
      } else if (carouselIndex === infiniteCarouselImages.length - 1) {
        // If swiped to the fake last (first image), jump to real first
        const newIndex = 1;
        
        // Use longer timeout to prevent blinking during transition
        setTimeout(() => {
          if (flatListRef.current && isMounted.current) {
            // Set index first to avoid state update during scrolling
            setCarouselIndex(newIndex);
            
            // Use requestAnimationFrame for smoother transition
            requestAnimationFrame(() => {
              if (flatListRef.current && isMounted.current) {
                flatListRef.current.scrollToIndex({ 
                  index: newIndex, 
                  animated: false,
                  viewPosition: 0.5
                });
              }
            });
          }
        }, 100);
      }
    } catch (err) {
      // Handle scroll end error silently
    }
  };

  const startAutoScroll = () => {
    stopAutoScroll();
    
    // Clear any existing timer
    if (carouselTimer.current) {
      clearInterval(carouselTimer.current);
      carouselTimer.current = null;
    }
    
    // Create new timer with platform-specific timing
    carouselTimer.current = setInterval(() => {
      if (!isMounted.current) {
        stopAutoScroll();
        return;
      }
      
      // Get the next index, considering looping back to first real image
      let nextIndex = carouselIndex + 1;
      
      // If at the end, we'll need special handling
      if (nextIndex >= infiniteCarouselImages.length) {
        // We need to jump from the last fake image to the first real image (at index 1)
        nextIndex = 1;
        
        // Scroll to the last real image first (this happens with animation)
        if (flatListRef.current) {
          try {
            flatListRef.current.scrollToIndex({ 
              index: infiniteCarouselImages.length - 1,
              animated: true,
              viewPosition: 0.5 
            });
            
            // After a short delay to complete the animation to the last image,
            // jump instantly to the first image without animation
            setTimeout(() => {
              if (flatListRef.current && isMounted.current) {
                setCarouselIndex(nextIndex);
                
                requestAnimationFrame(() => {
                  if (flatListRef.current && isMounted.current) {
                    flatListRef.current.scrollToIndex({
                      index: nextIndex,
                      animated: false,
                      viewPosition: 0.5
                    });
                  }
                });
              }
            }, 100);
          } catch (err) {
            // Auto-scroll loop error handling
          }
        }
      } else {
        // Normal case - just scroll to next image with animation
        if (flatListRef.current) {
          try {
            setCarouselIndex(nextIndex);
            flatListRef.current.scrollToIndex({ 
              index: nextIndex, 
              animated: true,
              viewPosition: 0.5 
            });
          } catch (err) {
            // Auto-scroll error handling
          }
        }
      }
    }, Platform.OS === 'android' ? 3000 : 2500); // Longer delay for Android
  };

  const stopAutoScroll = () => {
    if (carouselTimer.current) {
      clearInterval(carouselTimer.current);
      carouselTimer.current = null;
    }
  };

  const handleTouchStart = () => {
    setIsAutoScrolling(false);
    stopAutoScroll();
  };

  const handleTouchEnd = () => {
    setIsAutoScrolling(true);
  };

  const handleEventPress = (event) => {
    navigation.navigate('EventDetail', { event });
  };

  // Handle loading errors and item layout for better performance
  const getItemLayout = (_, index) => {
    const carouselWidth = IS_TABLET ? width * 0.9 : width - 36;
    
    return {
      length: carouselWidth,
      offset: carouselWidth * index,
      index,
    };
  };

  // Calculate responsive dimensions
  const carouselHeight = responsiveDimension(160, 240); // Increased height
  const eventCardHeight = responsiveDimension(150, 250);
  const userAvatarSize = responsiveDimension(40, 60);

  const handleScrollToIndexFailed = (info) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500));
    wait.then(() => {
      if (flatListRef.current && isMounted.current) {
        flatListRef.current.scrollToIndex({ 
          index: info.index, 
          animated: false,
          viewPosition: 0.5
        });
      }
    });
  };

  return (
    <View style={styles.container}>
      <Header />
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>You are offline. Some features may be limited.</Text>
        </View>
      )}
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.topSection}>
          {/* Greeting */}
          <View style={styles.greetingRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.greetingText}>Hey {getUserGreeting()}</Text>
                <Text style={styles.waveIcon}>👋</Text>
              </View>
              <Text style={styles.welcomeText}>Welcome to Diverse</Text>
            </View>
            <View>
              {isLoggedIn ? (
                profileImageUrl ? (
                  <View style={[styles.userAvatarContainer, { width: userAvatarSize, height: userAvatarSize, borderRadius: userAvatarSize/2 }]}>
                    <Image 
                      source={{ uri: profileImageUrl }}
                      defaultSource={require('../assets/icon.png')}
                      style={styles.userAvatar}
                      onLoadStart={() => setImageLoading(true)}
                      onLoad={() => setImageLoading(false)}
                      onError={() => {
                        setImageLoading(false);
                        setImageError(true);
                      }}
                    />
                    {imageLoading && (
                      <View style={styles.imageLoadingContainer}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      </View>
                    )}
                    {imageError && (
                      <View style={styles.imageErrorContainer}>
                        <Ionicons name="person" size={IS_TABLET ? 36 : 24} color={COLORS.primary} />
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={[styles.userAvatarContainer, { width: userAvatarSize, height: userAvatarSize, borderRadius: userAvatarSize/2 }]}>
                    <Ionicons name="person" size={IS_TABLET ? 36 : 24} color={COLORS.primary} />
                  </View>
                )
              ) : (
                <View style={[styles.userAvatarContainer, { width: userAvatarSize, height: userAvatarSize, borderRadius: userAvatarSize/2 }]}>
                  <Ionicons name="person" size={IS_TABLET ? 36 : 24} color={COLORS.primary} />
                </View>
              )}
            </View>
          </View>
          {/* Carousel */}
          <View style={[styles.carouselContainer, { height: carouselHeight }]}>
            <FlatList
              ref={flatListRef}
              data={infiniteCarouselImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              onScrollBeginDrag={handleTouchStart}
              onScrollEndDrag={handleTouchEnd}
              onViewableItemsChanged={onViewRef.current}
              viewabilityConfig={viewConfigRef.current}
              initialScrollIndex={1}
              getItemLayout={getItemLayout}
              onScrollToIndexFailed={handleScrollToIndexFailed}
              renderItem={({ item }) => (
                <View style={[styles.carouselImageContainer, { height: carouselHeight }]}>
                  <Image 
                    source={item} 
                    style={styles.carouselImage} 
                    resizeMode="cover"
                    fadeDuration={0} // Disable fade animation for smoother transitions
                  />
                </View>
              )}
              removeClippedSubviews={false} // Prevents blinking on some devices
              keyExtractor={(_, idx) => idx.toString()}
              maxToRenderPerBatch={5}
              windowSize={5}
              initialNumToRender={infiniteCarouselImages.length} // Preload all images
              maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
            />
          </View>
        </View>
        
        {/* Clear separator between sections */}
        <View style={styles.sectionSeparator} />
        
        <View style={styles.detailsSection}>
          {/* Details Section */}
          <View style={styles.detailsHeader}>
            <Text style={styles.detailsTitle}>Details</Text>
          </View>
          
          {/* Details Content - Grid Layout */}
          <View style={styles.sectionsContainer}>
            {/* Therapists Section (clickable) */}
            <TouchableOpacity 
              style={styles.sectionBox}
              onPress={() => navigation.navigate('Therapists')}
            >
              <Image 
                source={require('../assets/therapists_icon.jpeg')} 
                style={styles.sectionImage} 
                resizeMode="contain"
              />
              <Text style={styles.sectionTitle}>Therapists</Text>
            </TouchableOpacity>
            {/* Appointments Section (clickable) */}
            <TouchableOpacity 
              style={styles.sectionBox}
              onPress={() => navigation.navigate('Appointments')}
            >
              <Image 
                source={require('../assets/appointments_icon.jpeg')} 
                style={styles.sectionImage} 
                resizeMode="contain"
              />
              <Text style={styles.sectionTitle}>Appointments</Text>
            </TouchableOpacity>
            {/* Calendar Section (clickable) */}
            <TouchableOpacity 
              style={styles.sectionBox}
              onPress={() => navigation.navigate('Calendar')}
            >
              <Image 
                source={require('../assets/calendar.png')} 
                style={styles.sectionImage} 
                resizeMode="contain"
              />
              <Text style={styles.sectionTitle}>Calendar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: IS_TABLET ? 36 : 18,
    // Adjust padding based on platform
    paddingTop: Platform.OS === 'android' ? 0 : 10,
    paddingBottom: getBottomSpacing(),
  },
  scrollContainer: {
    flex: 1, 
  },
  scrollContentContainer: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  sectionSeparator: {
    height: Platform.OS === 'android' ? 15 : 20,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Adjust margin based on platform
    marginTop: Platform.OS === 'android' ? 8 : IS_TABLET ? 24 : 12,
    marginBottom: Platform.OS === 'android' ? 20 : IS_TABLET ? 24 : 16,
  },
  greetingText: {
    fontSize: scaledFontSize(18),
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  waveIcon: {
    fontSize: scaledFontSize(18),
    marginLeft: 4,
  },
  welcomeText: {
    fontSize: scaledFontSize(20),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: 2,
  },
  userAvatarContainer: {
    overflow: 'hidden',
    backgroundColor: COLORS.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.light,
  },
  userAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 999, // Ensure circular shape
  },
  carouselContainer: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: Platform.OS === 'android' ? 10 : (IS_TABLET ? 15 : 5),
  },
  carouselImageContainer: {
    width: IS_TABLET ? width * 0.9 : width - 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.secondaryDark,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  detailsSection: {
    // Not using flex to avoid layout issues
    marginTop: Platform.OS === 'android' ? -5 : 0,
  },
  detailsHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: IS_TABLET ? 24 : 16,
    // Reduce padding to decrease space
    paddingTop: Platform.OS === 'android' ? 0 : 5,
  },
  detailsTitle: {
    fontSize: scaledFontSize(22),
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  sectionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: IS_TABLET ? 32 : 24,
  },
  sectionBox: {
    width: IS_TABLET ? '30%' : '30%',
    aspectRatio: 0.8, // Changed from 1 to make it taller than wide
    backgroundColor: COLORS.white,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: IS_TABLET ? 24 : 18,
    marginHorizontal: '1.5%',
    ...SHADOWS.light,
  },
  sectionImage: {
    width: IS_TABLET ? 80 : 64,
    height: IS_TABLET ? 80 : 64,
    marginBottom: IS_TABLET ? 12 : 8,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: scaledFontSize(14),
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    width: '100%',
  },
  topSection: {
    // Not using flex to avoid layout issues
    paddingBottom: Platform.OS === 'android' ? 5 : 0,
  },
  imageLoadingContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryLight,
  },
  imageErrorContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.secondaryLight,
  },
  offlineBanner: {
    backgroundColor: '#FFC107',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineText: {
    color: '#212121',
    fontSize: scaledFontSize(14),
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default HomeScreen; 