import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Modal,
  Dimensions,
  Keyboard,
  TouchableWithoutFeedback,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../utils/theme';
import { scaledFontSize } from '../utils/responsive';

const { width } = Dimensions.get('window');

const SearchableDropdown = ({
  label,
  placeholder,
  items,
  selectedItem,
  onItemSelect,
  disabled = false,
  required = false
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(items);
  const searchInputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    setFilteredItems(items);
  }, [items]);

  const handleSearch = (text) => {
    setSearchQuery(text);
    const filtered = items.filter(item => 
      item.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const handleSelect = (item) => {
    onItemSelect(item);
    closeModal();
  };

  const openModal = () => {
    if (disabled) return;
    setModalVisible(true);
    // Reset search when opening modal
    setSearchQuery('');
    setFilteredItems(items);
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  };
  
  const closeModal = () => {
    // Start closing animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setModalVisible(false);
      setSearchQuery('');
    });
  };
  
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      
      <TouchableOpacity 
        style={[
          styles.dropdownButton, 
          disabled && styles.disabledButton
        ]} 
        onPress={openModal}
        disabled={disabled}
      >
        <Text style={[
          styles.selectedText,
          !selectedItem && styles.placeholderText,
          disabled && styles.disabledText
        ]}>
          {selectedItem || placeholder}
        </Text>
        <Ionicons 
          name="chevron-down" 
          size={20} 
          color={disabled ? COLORS.textLight : COLORS.textDark} 
        />
      </TouchableOpacity>

      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <Animated.View 
            style={[
              styles.modalContainer,
              { opacity: fadeAnim }
            ]}
          >
            <TouchableWithoutFeedback onPress={dismissKeyboard}>
              <Animated.View 
                style={[
                  styles.modalContent,
                  { transform: [{ translateY: slideAnim }] }
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{label}</Text>
                  <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={COLORS.textDark} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={20} color={COLORS.textMedium} />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder={`Search ${label.toLowerCase()}...`}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoFocus
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => handleSearch('')}>
                      <Ionicons name="close-circle" size={20} color={COLORS.textMedium} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                
                {filteredItems.length > 0 ? (
                  <FlatList
                    data={filteredItems}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item }) => {
                      // Highlight the matching part of the text
                      if (searchQuery) {
                        const lowerItem = item.toLowerCase();
                        const lowerQuery = searchQuery.toLowerCase();
                        const index = lowerItem.indexOf(lowerQuery);
                        
                        if (index !== -1) {
                          const beforeMatch = item.substring(0, index);
                          const match = item.substring(index, index + searchQuery.length);
                          const afterMatch = item.substring(index + searchQuery.length);
                          
                          return (
                            <TouchableOpacity 
                              style={[styles.item, selectedItem === item && styles.itemSelected]} 
                              onPress={() => handleSelect(item)}
                            >
                              <Text style={styles.itemText}>
                                {beforeMatch}
                                <Text style={styles.highlightedText}>{match}</Text>
                                {afterMatch}
                              </Text>
                              {selectedItem === item && (
                                <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                              )}
                            </TouchableOpacity>
                          );
                        }
                      }
                      
                      return (
                        <TouchableOpacity 
                          style={[styles.item, selectedItem === item && styles.itemSelected]} 
                          onPress={() => handleSelect(item)}
                        >
                          <Text style={styles.itemText}>{item}</Text>
                          {selectedItem === item && (
                            <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                    style={styles.list}
                    showsVerticalScrollIndicator={true}
                    initialNumToRender={15}
                    maxToRenderPerBatch={20}
                    windowSize={10}
                  />
                ) : (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={40} color={COLORS.textLight} />
                    <Text style={styles.emptyText}>No items found</Text>
                    <Text style={styles.emptySubtext}>Try a different search term</Text>
                  </View>
                )}
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: scaledFontSize(14),
    fontWeight: '500',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  required: {
    color: COLORS.error,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 48,
  },
  disabledButton: {
    backgroundColor: COLORS.backgroundLight,
    borderColor: COLORS.borderLight,
  },
  selectedText: {
    fontSize: scaledFontSize(14),
    color: COLORS.textDark,
  },
  placeholderText: {
    color: COLORS.textLight,
  },
  disabledText: {
    color: COLORS.textLight,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    width: width * 0.9,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: scaledFontSize(18),
    fontWeight: '600',
    color: COLORS.textDark,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: scaledFontSize(14),
  },
  list: {
    maxHeight: 300,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  itemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  itemText: {
    fontSize: scaledFontSize(14),
    color: COLORS.textDark,
    flex: 1,
  },
  highlightedText: {
    backgroundColor: 'rgba(255, 213, 79, 0.4)',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: scaledFontSize(16),
    color: COLORS.textMedium,
    marginTop: 12,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: scaledFontSize(14),
    color: COLORS.textLight,
    marginTop: 8,
  },
});

export default SearchableDropdown;
