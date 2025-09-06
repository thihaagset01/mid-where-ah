import {
  announceForAccessibility,
  isScreenReaderEnabled,
  getButtonAccessibilityProps,
  getTextInputAccessibilityProps,
  getSwitchAccessibilityProps,
  getSliderAccessibilityProps,
  getListAccessibilityProps,
  getListItemAccessibilityProps,
  getHeadingAccessibilityProps,
  getProgressAccessibilityProps,
  getImageAccessibilityProps,
  getTabAccessibilityProps,
  getModalAccessibilityProps,
  validateAccessibilityProps,
  AccessibilityProps,
} from '../../utils/accessibility';

// Mock React Native modules
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  AccessibilityInfo: {
    announceForAccessibility: jest.fn(),
    announceForAccessibilityWithOptions: jest.fn(),
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
    setAccessibilityFocus: jest.fn(),
  },
}));

describe('Accessibility Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('announceForAccessibility', () => {
    it('should announce message on iOS', () => {
      const mockAnnounce = require('react-native').AccessibilityInfo.announceForAccessibility;
      announceForAccessibility('Test message');
      expect(mockAnnounce).toHaveBeenCalledWith('Test message');
    });

    it('should use announceForAccessibilityWithOptions on Android', () => {
      const originalOS = require('react-native').Platform.OS;
      require('react-native').Platform.OS = 'android';
      
      const mockAnnounceWithOptions = require('react-native').AccessibilityInfo.announceForAccessibilityWithOptions;
      announceForAccessibility('Test message');
      
      expect(mockAnnounceWithOptions).toHaveBeenCalledWith('Test message', {
        queue: false,
      });
      
      // Restore original OS
      require('react-native').Platform.OS = originalOS;
    });
  });

  describe('isScreenReaderEnabled', () => {
    it('should return screen reader status', async () => {
      const mockIsScreenReaderEnabled = require('react-native').AccessibilityInfo.isScreenReaderEnabled;
      mockIsScreenReaderEnabled.mockResolvedValue(true);
      
      const result = await isScreenReaderEnabled();
      expect(result).toBe(true);
    });
  });

  describe('getButtonAccessibilityProps', () => {
    it('should generate basic button props', () => {
      const props = getButtonAccessibilityProps('Submit');
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'button',
        accessibilityLabel: 'Submit',
        accessibilityHint: undefined,
        accessibilityState: {
          disabled: false,
        },
      });
    });

    it('should include hint and disabled state', () => {
      const props = getButtonAccessibilityProps('Submit', 'Submits the form', true);
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'button',
        accessibilityLabel: 'Submit',
        accessibilityHint: 'Submits the form',
        accessibilityState: {
          disabled: true,
        },
      });
    });
  });

  describe('getTextInputAccessibilityProps', () => {
    it('should generate basic text input props', () => {
      const props = getTextInputAccessibilityProps('Email');
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'text',
        accessibilityLabel: 'Email',
        accessibilityHint: undefined,
        accessibilityValue: undefined,
      });
    });

    it('should include required indicator and value', () => {
      const props = getTextInputAccessibilityProps(
        'Email',
        'test@example.com',
        'Enter your email',
        true
      );
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'text',
        accessibilityLabel: 'Email (required)',
        accessibilityHint: 'Placeholder: Enter your email',
        accessibilityValue: { text: 'test@example.com' },
      });
    });
  });

  describe('getSwitchAccessibilityProps', () => {
    it('should generate switch props', () => {
      const props = getSwitchAccessibilityProps('Notifications', true, 'Toggle notifications');
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'switch',
        accessibilityLabel: 'Notifications',
        accessibilityHint: 'Toggle notifications',
        accessibilityState: {
          checked: true,
        },
      });
    });
  });

  describe('getSliderAccessibilityProps', () => {
    it('should generate slider props', () => {
      const props = getSliderAccessibilityProps('Volume', 75, 0, 100, 'Adjust volume level');
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'adjustable',
        accessibilityLabel: 'Volume',
        accessibilityHint: 'Adjust volume level',
        accessibilityValue: {
          min: 0,
          max: 100,
          now: 75,
          text: '75',
        },
        accessibilityActions: [
          { name: 'increment', label: 'Increase value' },
          { name: 'decrement', label: 'Decrease value' },
        ],
      });
    });
  });

  describe('getListAccessibilityProps', () => {
    it('should generate list props', () => {
      const props = getListAccessibilityProps('Meeting locations', 5);
      
      expect(props).toEqual({
        accessible: false,
        accessibilityRole: 'list',
        accessibilityLabel: 'Meeting locations, 5 items',
      });
    });
  });

  describe('getListItemAccessibilityProps', () => {
    it('should generate list item props', () => {
      const props = getListItemAccessibilityProps('Central Library', 0, 3, true);
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'button',
        accessibilityLabel: 'Central Library, 1 of 3',
        accessibilityState: {
          selected: true,
        },
      });
    });
  });

  describe('getHeadingAccessibilityProps', () => {
    it('should generate heading props with default level', () => {
      const props = getHeadingAccessibilityProps('Page Title');
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'header',
        accessibilityLabel: 'Page Title',
      });
    });

    it('should include level hint for non-primary headings', () => {
      const props = getHeadingAccessibilityProps('Section Title', 2);
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'header',
        accessibilityLabel: 'Section Title',
        accessibilityHint: 'Heading level 2',
      });
    });
  });

  describe('getProgressAccessibilityProps', () => {
    it('should generate determinate progress props', () => {
      const props = getProgressAccessibilityProps('Upload progress', 60, 100);
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'progressbar',
        accessibilityLabel: 'Upload progress',
        accessibilityValue: {
          min: 0,
          max: 100,
          now: 60,
          text: '60% complete',
        },
        accessibilityState: {
          busy: false,
        },
      });
    });

    it('should generate indeterminate progress props', () => {
      const props = getProgressAccessibilityProps('Loading', 0, 100, true);
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'progressbar',
        accessibilityLabel: 'Loading',
        accessibilityValue: {
          text: 'Loading',
        },
        accessibilityState: {
          busy: true,
        },
      });
    });
  });

  describe('getImageAccessibilityProps', () => {
    it('should generate image props', () => {
      const props = getImageAccessibilityProps('Map showing meeting locations');
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'image',
        accessibilityLabel: 'Map showing meeting locations',
      });
    });

    it('should handle decorative images', () => {
      const props = getImageAccessibilityProps('', true);
      
      expect(props).toEqual({
        accessible: false,
        accessibilityRole: undefined,
        accessibilityLabel: undefined,
      });
    });
  });

  describe('getTabAccessibilityProps', () => {
    it('should generate tab props', () => {
      const props = getTabAccessibilityProps('Map View', true, 0, 3);
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'tab',
        accessibilityLabel: 'Map View, tab 1 of 3',
        accessibilityState: {
          selected: true,
        },
      });
    });
  });

  describe('getModalAccessibilityProps', () => {
    it('should generate modal props', () => {
      const props = getModalAccessibilityProps('Settings');
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'text',
        accessibilityLabel: 'Settings',
        accessibilityViewIsModal: true,
      });
    });

    it('should generate alert props for important modals', () => {
      const props = getModalAccessibilityProps('Error occurred', true);
      
      expect(props).toEqual({
        accessible: true,
        accessibilityRole: 'alert',
        accessibilityLabel: 'Error occurred',
        accessibilityViewIsModal: true,
      });
    });
  });

  describe('validateAccessibilityProps', () => {
    it('should return no warnings for valid props', () => {
      const props: AccessibilityProps = {
        accessible: true,
        accessibilityLabel: 'Valid button',
        accessibilityRole: 'button',
      };
      
      const warnings = validateAccessibilityProps(props);
      expect(warnings).toEqual([]);
    });

    it('should warn about missing label for accessible elements', () => {
      const props: AccessibilityProps = {
        accessible: true,
      };
      
      const warnings = validateAccessibilityProps(props);
      expect(warnings).toContain('Accessible element should have an accessibilityLabel');
    });

    it('should warn about missing label for buttons', () => {
      const props: AccessibilityProps = {
        accessibilityRole: 'button',
      };
      
      const warnings = validateAccessibilityProps(props);
      expect(warnings).toContain('Button should have an accessibilityLabel');
    });

    it('should warn about long accessibility hints', () => {
      const props: AccessibilityProps = {
        accessible: true,
        accessibilityLabel: 'Button',
        accessibilityHint: 'This is a very long hint that exceeds the recommended character limit for accessibility hints',
      };
      
      const warnings = validateAccessibilityProps(props);
      expect(warnings).toContain('AccessibilityHint should be concise (under 50 characters)');
    });
  });
});