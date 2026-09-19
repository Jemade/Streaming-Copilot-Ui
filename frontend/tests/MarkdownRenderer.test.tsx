import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '../src/components/MarkdownRenderer';

describe('MarkdownRenderer Component', () => {
  it('renders standard markdown paragraphs and bold text', () => {
    render(<MarkdownRenderer content="This is **bold** text." />);
    expect(screen.getByText('bold')).toBeInTheDocument();
  });

  it('renders code blocks with language badge and copy button', () => {
    const codeMarkdown = '```python\ndef hello():\n    return "world"\n```';
    render(<MarkdownRenderer content={codeMarkdown} />);

    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.getByText(/def hello/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy code/i })).toBeInTheDocument();
  });

  it('stabilizes incomplete/partial code fences during streaming', () => {
    // Unclosed code block streamed partially
    const incompleteMarkdown = '```typescript\nconst message: string = "streaming";';
    render(<MarkdownRenderer content={incompleteMarkdown} isStreaming={true} />);

    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByText(/const message: string = "streaming";/)).toBeInTheDocument();
  });

  it('renders tables properly', () => {
    const tableMarkdown = `
| Header 1 | Header 2 |
| :--- | :--- |
| Val 1 | Val 2 |
`;
    render(<MarkdownRenderer content={tableMarkdown} />);

    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Val 1')).toBeInTheDocument();
  });
});
