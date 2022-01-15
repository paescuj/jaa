import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
} from '@chakra-ui/react';
import { useRef } from 'react';
import {
  Controller,
  useForm as useReactHookForm,
  useWatch,
} from 'react-hook-form';
import { useIntl } from 'react-intl';

import Modal, { useModal } from './Modal';

export function useFormModal({
  onSubmit,
  resetDataOnClose,
  modalOptions,
  formOptions,
} = {}) {
  const form = useReactHookForm(formOptions);

  if (resetDataOnClose) {
    modalOptions = { ...modalOptions, onClose: () => form.reset() };
  }
  const modal = useModal(modalOptions);

  return {
    ...modal,
    ...form,
    useWatch,
    onSubmit,
  };
}

export default function FormModal({
  state,
  id,
  title,
  fields,
  actions,
  submitTextId,
  ...props
}) {
  const initialFocusRef = useRef();
  const { formatMessage, messages } = useIntl();

  actions ??= [
    { text: formatMessage({ id: 'cancel' }), close: true },
    {
      text: formatMessage({ id: submitTextId ?? 'save' }),
      props: {
        isLoading: state.formState.isSubmitting,
        type: 'submit',
        form: id,
        colorScheme: 'blue',
      },
    },
  ];

  let f;
  if (fields instanceof Function) {
    f = fields(state.data);
  } else {
    f = fields;
  }

  const sanitizedFields = f.map((field, index) => {
    field.title ??= formatMessage({ id: field.name });
    field.options ??= {
      required: formatMessage(
        {
          id: `field_is_required`,
        },
        { field: field.title }
      ),
    };
    field.component ??= Input;
    field.props ??= {};
    field.props.placeholder ??=
      messages[`${field.name}_placeholder`] &&
      formatMessage({
        id: `${field.name}_placeholder`,
      });
    if (!field.controller && field.register != false) {
      const register = state.register(field.name, field.options);
      const props =
        (index === 0 && field.initialFocus !== false) || field.initialFocus
          ? {
              ...register,
              ref: (e) => {
                register.ref(e);
                initialFocusRef.current = e;
              },
            }
          : register;
      Object.assign(field.props, props);
    }
    return field;
  });

  return (
    <Modal
      state={state}
      initialFocusRef={initialFocusRef}
      title={title}
      content={
        <form id={id} onSubmit={state.handleSubmit(state.onSubmit)}>
          {sanitizedFields.map((field, index) => (
            <FormControl
              key={field.name}
              mt={index > 0 && 2}
              isInvalid={state.formState.errors[field.name]}
            >
              <FormLabel>{field.title}</FormLabel>
              {field.controller ? (
                <Controller
                  name={field.name}
                  control={state.control}
                  rules={field.options}
                  render={({ field: renderProps }) => (
                    <field.component {...renderProps} {...field.props} />
                  )}
                />
              ) : (
                <field.component {...field.props} />
              )}
              <FormErrorMessage>
                {state.formState.errors[field.name]?.message}
              </FormErrorMessage>
            </FormControl>
          ))}
        </form>
      }
      actions={actions}
      {...props}
    />
  );
}
