import React, { useState, useEffect } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { useUser } from '../context/UserContext';
import { getBottomSpacing, IS_TABLET, responsiveDimension, scaledFontSize } from '../utils/responsive';
import { COLORS, SHADOWS } from '../utils/theme';
import Header from './Header';

const blogs = [
  {
    id: 1,
    title: 'Micro relaxation for work place happiness',
    image: require('../assets/blogs.png'),
    date: '2024-12-04',
  },
  {
    id: 2,
    title: 'Why Workplace Joy Matters?',
    image: require('../assets/blogs.png'),
    date: '2024-12-04',
  },
  {
    id: 3,
    title: 'Introductory to imposter syndrome',
    image: require('../assets/blogs.png'),
    date: '2024-12-03',
  },
  {
    id: 4,
    title: 'Taking a brief pause to improve productivity',
    image: require('../assets/blogs.png'),
    date: '2024-12-03',
  },
  {
    id: 5,
    title: 'Building Social Connections at Work',
    image: require('../assets/blogs.png'),
    date: '2024-12-02',
  },
  {
    id: 6,
    title: 'Work-life Balance: The Key to Happiness',
    image: require('../assets/blogs.png'),
    date: '2024-12-02',
  },
  {
    id: 7,
    title: 'Financial Security and Well-being',
    image: require('../assets/blogs.png'),
    date: '2024-12-01',
  },
  {
    id: 8,
    title: 'Acceptance and Empathy in the Workplace',
    image: require('../assets/blogs.png'),
    date: '2024-12-01',
  },
  {
    id: 9,
    title: 'Scope for Innovation and Creativity',
    image: require('../assets/blogs.png'),
    date: '2024-11-30',
  },
  {
    id: 10,
    title: 'Autonomy and Decision Making',
    image: require('../assets/blogs.png'),
    date: '2024-11-30',
  },
];

const sortedBlogs = blogs.sort((a, b) => new Date(b.date) - new Date(a.date));

const BlogsScreen = ({ navigation }) => {
  const { userData, isLoggedIn } = useUser();
  
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
  const getUserName = () => {
    if (!isLoggedIn || !userData) return 'User';
    
    // Try to get the user's name from userData
    const fullName = userData.name || '';
    if (fullName.trim() === '') return 'User';
    
    // Extract the first name from the full name
    const firstName = fullName.split(' ')[0];
    return firstName;
  };
  
  // Responsive dimensions
  const blogImageSize = responsiveDimension(80, 120);
  
  const handleBlogPress = (blog) => {
    navigation.navigate('BlogDetail', { blog });
  };
  
  return (
    <View style={styles.container}>
      <Header />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.greetingText}>Hey {getUserName()}</Text>
              <Text style={styles.waveIcon}>👋</Text>
            </View>
            <Text numberOfLines={1} style={styles.readBlogsText}>Read Blogs by Er. Rishav Sethi</Text>
          </View>
        </View>
        <Text style={styles.sectionTitle}>Blogs</Text>
        
        {IS_TABLET ? (
          // Grid layout for tablets - 2 columns
          <View style={styles.blogGrid}>
            {sortedBlogs.map((blog) => (
              <TouchableOpacity 
                key={blog.id} 
                style={styles.blogCardTablet} 
                activeOpacity={0.8}
                onPress={() => handleBlogPress(blog)}
              >
                <Image source={blog.image} style={[styles.blogImageTablet, { height: blogImageSize }]} />
                <View style={styles.blogContent}>
                  <Text style={styles.blogTitle}>{blog.title}</Text>
                  <View style={styles.blogMetaRow}>
                    <Text style={styles.blogDate}>{new Date(blog.date).toLocaleDateString()}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          // List layout for phones
          sortedBlogs.map((blog) => (
            <TouchableOpacity 
              key={blog.id} 
              style={styles.blogCard} 
              activeOpacity={0.8}
              onPress={() => handleBlogPress(blog)}
            >
              <Image 
                source={blog.image} 
                style={[styles.blogImage, { width: blogImageSize, height: blogImageSize }]} 
              />
              <View style={styles.blogContent}>
                <Text style={styles.blogTitle}>{blog.title}</Text>
                <View style={styles.blogMetaRow}>
                  <Text style={styles.blogDate}>{new Date(blog.date).toLocaleDateString()}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: IS_TABLET ? 36 : 18,
    paddingTop: Platform.OS === 'android' ? 0 : 10,
    paddingBottom: getBottomSpacing(),
  },
  scrollView: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'android' ? 8 : IS_TABLET ? 20 : 12,
    marginBottom: Platform.OS === 'android' ? 10 : IS_TABLET ? 24 : 16,
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
  readBlogsText: {
    fontSize: scaledFontSize(19),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: 2,
    marginBottom: IS_TABLET ? 12 : 8,
  },
  sectionTitle: {
    fontSize: scaledFontSize(20),
    fontWeight: 'bold',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: IS_TABLET ? 20 : 10,
    marginTop: 0,
  },
  blogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  blogCardTablet: {
    backgroundColor: COLORS.secondaryDark,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    width: '48%', // Almost half width for 2 columns with spacing
    ...SHADOWS.light,
  },
  blogImageTablet: {
    width: '100%',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: COLORS.white,
  },
  blogCard: {
    backgroundColor: COLORS.secondaryDark,
    borderRadius: 18,
    padding: IS_TABLET ? 20 : 16,
    marginBottom: IS_TABLET ? 24 : 18,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.light,
  },
  blogImage: {
    borderRadius: 12,
    marginRight: IS_TABLET ? 24 : 16,
    backgroundColor: COLORS.white,
  },
  blogContent: {
    flex: 1,
  },
  blogTitle: {
    fontSize: scaledFontSize(17),
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  blogMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blogDate: {
    fontSize: scaledFontSize(15),
    color: COLORS.primary,
  },
  offlineText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: IS_TABLET ? 18 : 14,
  },
  offlineBanner: {
    backgroundColor: '#ffc107',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: IS_TABLET ? 16 : 10,
    alignItems: 'center',
  },
});

export default BlogsScreen; 