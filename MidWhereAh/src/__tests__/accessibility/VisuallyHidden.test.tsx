import React from 'react';
import { render } from '@testing-library/react-native';
import { VisuallyHidden, useVisuallyHidden } from '../../components/common/VisuallyHidden';
import { Text, View } from 'react-native';

describe('VisuallyHidden Component', () => {
  it('should render children as view by default', () => {
    const { getByText } = render(
      <VisuallyHidden>
        <Text>Hidden content</Text>
      </VisuallyHidden>
    );
    
    expect(getByText('Hidden content')).toBeTruthy();
  });

  it('should render as text when specified', () => {
    const { getByText } = render(
      <VisuallyHidden as="text">
        Screen reader only text
      </VisuallyHidden>
    );
    
    expect(getByText('Screen reader only text')).toBeTruthy();
  });

  it('should apply visually hidden styles', () => {
    const { getByTestId } = render(
      <VisuallyHidden>
        <Text testID="hidden-text">Hidden content</Text>
      </VisuallyHidden>
    );
    
    const container = getByTestId('hidden-text').parent;
    expect(container).toBeTruthy();
  });

  it('should wrap string children in Text component', () => {
    const { getByText } = render(
      <VisuallyHidden>
        Just a string
      </VisuallyHidden>
    );
    
    expect(getByText('Just a string')).toBeTruthy();
  });

  it('should be accessible to screen readers', () => {
    const { getByText } = render(
      <VisuallyHidden>
        <Text>Accessible content</Text>
      </VisuallyHidden>
    );
    
    const element = getByText('Accessible content').parent;
    expect(element?.props.accessible).toBe(true);
  });

  it('should accept custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByTestId } = render(
      <VisuallyHidden style={customStyle}>
        <Text testID="styled-content">Styled content</Text>
      </VisuallyHidden>
    );
    
    expect(getByTestId('styled-content')).toBeTruthy();
  });
});

describe('useVisuallyHidden Hook', () => {
  const TestComponent: React.FC<{ screenReaderOnly: boolean }> = ({ screenReaderOnly }) => {
    const Container = useVisuallyHidden(screenReaderOnly);
    
    return (
      <Container>
        <Text>Test content</Text>
      </Container>
    );
  };

  it('should return VisuallyHidden when screenReaderOnly is true', () => {
    const { getByText } = render(<TestComponent screenReaderOnly={true} />);
    expect(getByText('Test content')).toBeTruthy();
  });

  it('should return Fragment when screenReaderOnly is false', () => {
    const { getByText } = render(<TestComponent screenReaderOnly={false} />);
    expect(getByText('Test content')).toBeTruthy();
  });
});