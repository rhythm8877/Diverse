import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SHADOWS } from '../utils/theme';
import { IS_TABLET, scaledFontSize, getStatusBarHeight } from '../utils/responsive';

const BlogDetailScreen = ({ route, navigation }) => {
  const { blog } = route.params;
  
  // Handle back navigation
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Format the date properly
  const formattedDate = new Date(blog.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Blog content based on the title - this would ideally come from an API
  const getContent = () => {
    switch(blog.id) {
      case 1:
        return (
          <>
            <Text style={styles.paragraph}>
              Micro-relaxation exercises are quick, focused activities that encourage relaxation,
              mindfulness, and mental clarity. Unlike long breaks or extensive self-care routines, these
              activities can be easily introduced into your workday without interfering with productivity.
              They emphasize simple activities that provide big consequences, such as reducing stress,
              recharging your batteries, and approaching jobs with new zeal.
            </Text>
            <Text style={styles.paragraph}>
              Deep breathing is perhaps the simplest yet most effective micro-relaxation technique. 
              Breathing is a natural stress reliever, yet we often overlook its effectiveness. Shallow 
              breathing, common during stress, limits oxygen flow to the brain and body. Taking a minute 
              to practice deep diaphragmatic breathing can reset your mind, lower stress hormones, and 
              improve focus almost immediately.
            </Text>
            <Text style={styles.paragraph}>
              The 4-7-8 breathing method is particularly effective: inhale for 4 seconds, hold for 7 
              seconds, and exhale for 8 seconds. Just 3-4 cycles can significantly change your mental 
              state. This technique activates your parasympathetic nervous system, countering the 
              fight-or-flight response that stress triggers.
            </Text>
            <Text style={styles.paragraph}>
              Another powerful micro-relaxation technique is the "5-4-3-2-1" grounding exercise. 
              When feeling overwhelmed, identify 5 things you can see, 4 things you can touch, 3 things 
              you can hear, 2 things you can smell, and 1 thing you can taste. This mindfulness practice 
              brings you into the present moment, stopping anxious thoughts about the future or past.
            </Text>
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.paragraph}>
              Workplace joy isn't just a nice-to-have element—it's a critical factor that influences 
              both personal wellbeing and organizational success. When employees experience joy and 
              satisfaction at work, they demonstrate higher levels of engagement, creativity, and 
              productivity. Research consistently shows that happy employees are up to 20% more 
              productive than unhappy ones.
            </Text>
            <Text style={styles.paragraph}>
              Beyond productivity, workplace joy significantly impacts retention rates. Organizations with 
              high employee happiness scores experience 50% less turnover, translating to substantial 
              cost savings in recruitment and training. Happy employees become advocates for their 
              workplace, attracting top talent and creating a positive reputation in the industry.
            </Text>
            <Text style={styles.paragraph}>
              Workplace joy also influences innovation and problem-solving capabilities. When employees 
              feel positive and secure in their environment, they're more likely to take calculated risks, 
              propose creative solutions, and collaborate effectively with colleagues. This psychological 
              safety creates an atmosphere where new ideas can flourish.
            </Text>
            <Text style={styles.paragraph}>
              On a personal level, finding joy at work reduces stress and its associated health problems. 
              Considering that most adults spend approximately one-third of their lives at work, the impact 
              of workplace emotions on overall life satisfaction cannot be overstated. When work becomes 
              a source of fulfillment rather than frustration, it positively affects all aspects of life, 
              from physical health to personal relationships.
            </Text>
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.paragraph}>
              Imposter syndrome is a psychological pattern where individuals doubt their accomplishments 
              and have a persistent fear of being exposed as a "fraud." Despite external evidence of 
              their competence, those experiencing imposter syndrome remain convinced they don't deserve 
              the success they've achieved and attribute it to luck, timing, or deceiving others about 
              their abilities.
            </Text>
            <Text style={styles.paragraph}>
              This phenomenon is surprisingly common, with an estimated 70% of people experiencing 
              imposter feelings at some point in their careers. Interestingly, imposter syndrome often 
              affects high-achieving individuals and is particularly prevalent in work environments 
              that value expertise and excellence. It's important to recognize that experiencing 
              these feelings doesn't indicate inadequacy—in fact, it often appears in those who are 
              truly competent and conscientious.
            </Text>
            <Text style={styles.paragraph}>
              The effects of imposter syndrome can be far-reaching. It may lead to overworking as a 
              way to "cover up" perceived inadequacies, perfectionism that paralyzes progress, fear 
              of asking questions, reluctance to apply for promotions, and significant anxiety. Over 
              time, these patterns can contribute to burnout and limit career advancement despite 
              having the necessary skills and qualifications.
            </Text>
            <Text style={styles.paragraph}>
              Understanding that imposter syndrome is a common experience rather than a personal 
              failing is the first step toward managing these feelings. Recognizing your objective 
              accomplishments, embracing mistakes as learning opportunities, and discussing these 
              feelings with trusted colleagues can help mitigate the impact of imposter syndrome 
              and build authentic confidence in your professional capabilities.
            </Text>
          </>
        );
      default:
        return (
          <>
            <Text style={styles.paragraph}>
              This detailed blog explores the importance of {blog.title.toLowerCase()} in the modern workplace.
              Research has consistently shown that attention to this aspect of work life significantly
              improves employee satisfaction, productivity, and overall organizational success.
            </Text>
            <Text style={styles.paragraph}>
              Recent studies indicate that companies prioritizing {blog.title.toLowerCase()} experience
              up to 30% higher retention rates and report substantially higher employee engagement scores.
              This translates directly into measurable business outcomes, including increased innovation,
              better customer service, and ultimately, improved financial performance.
            </Text>
            <Text style={styles.paragraph}>
              Implementing effective strategies for {blog.title.toLowerCase()} doesn't necessarily require
              major organizational overhauls. Often, small but consistent changes in workplace policies,
              leadership approaches, and individual habits can create meaningful improvements. These
              incremental steps build upon each other to transform workplace culture over time.
            </Text>
            <Text style={styles.paragraph}>
              As we look toward the future of work, {blog.title.toLowerCase()} will likely become an
              even more critical factor in organizational success. With changing workforce expectations
              and increasing recognition of the connection between wellbeing and productivity, forward-thinking
              organizations are already incorporating these principles into their strategic planning.
            </Text>
          </>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with back button only */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}></View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Blog Title */}
        <Text style={styles.blogTitle}>{blog.title}</Text>
        
        {/* Date */}
        <Text style={styles.dateText}>{formattedDate}</Text>
        
        {/* Featured Image */}
        <Image source={blog.image} style={styles.featuredImage} />
        
        {/* Blog Content */}
        <View style={styles.contentContainer}>
          {getContent()}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: getStatusBarHeight() + 10,
    paddingBottom: 12,
    backgroundColor: COLORS.secondary,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.secondaryDark,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 18,
  },
  blogTitle: {
    fontSize: scaledFontSize(24),
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  dateText: {
    fontSize: scaledFontSize(14),
    color: COLORS.textMedium,
    marginBottom: 16,
  },
  featuredImage: {
    width: '100%',
    height: IS_TABLET ? 300 : 200,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: COLORS.secondaryDark,
  },
  contentContainer: {
    marginBottom: 40,
  },
  paragraph: {
    fontSize: scaledFontSize(16),
    lineHeight: IS_TABLET ? 28 : 24,
    color: COLORS.textDark,
    marginBottom: IS_TABLET ? 24 : 16,
  },
  offlineBanner: {
    backgroundColor: '#ffc107',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    alignItems: 'center',
  },
  offlineText: {
    color: '#333',
    fontWeight: 'bold',
  },
});

export default BlogDetailScreen; 