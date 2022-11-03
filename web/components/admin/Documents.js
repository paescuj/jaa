import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Button,
  Flex,
  Text,
} from '@chakra-ui/react';
import { AddPage, Plus, Trash } from 'iconoir-react';
import { useIntl } from 'react-intl';

import FormModal, { useFormModal } from '@/components/common/FormModal';
import { directus } from '@/lib/directus';

import Popover from './Popover';
import Preview from './Preview';

export default function Documents({ docs, refreshDocs }) {
  const { formatMessage } = useIntl();

  const newDocFormModal = useFormModal({
    onSubmit: onSubmitNewDoc,
    resetDataOnClose: true,
    modalOptions: { clearDataOnClose: true },
  });
  async function onSubmitNewDoc({ title, file }) {
    // Upload PDF file
    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', await file[0]);
    const filesResponse = await directus.files.createOne(formData);

    // Create / update doc entry
    if (!newDocFormModal.data) {
      await directus.items('docs').createOne({
        title: title,
        file: [filesResponse.id],
        global: true,
      });
    } else {
      await directus.items('docs').updateOne(newDocFormModal.data, {
        file_dark: [filesResponse.id],
      });
    }

    refreshDocs();
    newDocFormModal.close();
  }
  async function deleteDoc(docId) {
    await directus.items('docs').deleteOne(docId);
    refreshDocs();
  }

  return (
    <>
      <Flex direction={{ base: 'column', sm: 'row' }}>
        {docs.filter((doc) => doc.global === true).length === 0 ? (
          <Text flex="1">
            {formatMessage({ id: 'no_general_documents_yet' })}
          </Text>
        ) : (
          <Accordion flex="1" allowMultiple>
            {docs
              .filter((doc) => doc.global === true)
              .map((doc) => (
                <AccordionItem key={doc.id}>
                  <h2>
                    <AccordionButton>
                      <Flex flex="1">
                        <Preview
                          name={doc.title}
                          previewUrl={doc.preview[0]}
                          type="avatar"
                        />
                        <Flex ml="3" align="center">
                          <Text fontSize="lg" fontWeight="bold">
                            {doc.title}
                          </Text>
                        </Flex>
                      </Flex>
                      <AccordionIcon />
                    </AccordionButton>
                  </h2>

                  <AccordionPanel pb={4}>
                    <Preview
                      name={doc.title}
                      previewUrl={doc.preview[0]}
                      type="image"
                      mb={2}
                    />
                    <Button
                      size="sm"
                      leftIcon={<Plus />}
                      colorScheme="blue"
                      disabled={doc.file_dark.length > 0}
                      mr={{ base: 0, sm: 4 }}
                      mb={{ base: 4, sm: 0 }}
                      onClick={() => {
                        newDocFormModal.setValue('title', doc.title);
                        newDocFormModal.open(doc.id);
                      }}
                    >
                      {formatMessage({
                        id: 'add_dark_variant',
                      })}
                    </Button>
                    <Popover
                      mode="confirmation"
                      onConfirm={() => deleteDoc(doc.id)}
                      body={formatMessage({
                        id: 'remove_document_confirm',
                      })}
                    >
                      <Button size="sm" leftIcon={<Trash />} colorScheme="red">
                        {formatMessage({
                          id: 'remove_document',
                        })}
                      </Button>
                    </Popover>
                  </AccordionPanel>
                </AccordionItem>
              ))}
          </Accordion>
        )}
        <Button
          mt={{ base: 4, sm: 0 }}
          ml={{ base: 0, sm: 4 }}
          leftIcon={<AddPage />}
          colorScheme="blue"
          onClick={() => {
            newDocFormModal.open();
          }}
        >
          {formatMessage({ id: 'add_document' })}
        </Button>
      </Flex>

      <FormModal
        state={newDocFormModal}
        id="new-doc-form"
        title={formatMessage({ id: 'add_general_document' })}
        fields={(data) => [
          {
            name: 'title',
            props: {
              placeholder: formatMessage({ id: 'document_title_placeholder' }),
              disabled: data != null,
            },
          },
          {
            name: 'file',
            props: {
              type: 'file',
              accept: 'application/pdf',
              sx: {
                '::file-selector-button': {
                  height: '100%',
                },
              },
            },
          },
        ]}
        size="xl"
      />
    </>
  );
}
