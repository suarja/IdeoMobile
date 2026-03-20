import type { Clarification } from '../use-idea-session';
import { QuestionConfirmCancel } from './question-confirm-cancel';
import { QuestionMultiSelect } from './question-multi-select';
import { QuestionSingleChoice } from './question-single-choice';

type Props = {
  clarification: Clarification;
  onSelect: (option: string) => void;
  isDisabled: boolean;
};

export function ClarificationBlock({ clarification, onSelect, isDisabled }: Props) {
  if (clarification.type === 'single_choice' && clarification.options) {
    return (
      <QuestionSingleChoice
        question={clarification.question}
        options={clarification.options}
        onSelect={onSelect}
        isDisabled={isDisabled}
      />
    );
  }

  if (clarification.type === 'multi_select' && clarification.options) {
    return (
      <QuestionMultiSelect
        question={clarification.question}
        options={clarification.options}
        onSelect={onSelect}
        isDisabled={isDisabled}
      />
    );
  }

  if (clarification.type === 'confirm_cancel') {
    return (
      <QuestionConfirmCancel
        question={clarification.question}
        confirmLabel={clarification.confirmLabel ?? 'Confirm'}
        cancelLabel={clarification.cancelLabel ?? 'Cancel'}
        onConfirm={() => onSelect(clarification.confirmLabel ?? 'Confirm')}
        onCancel={() => onSelect(clarification.cancelLabel ?? 'Cancel')}
        isDisabled={isDisabled}
      />
    );
  }

  return null;
}
