import { Avatar, Image } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

import { getBearer, url as directusUrl } from '@/lib/directus';

export default function Preview({ name, previewUrl, type, ...props }) {
  const [previewImg, setPreviewImg] = useState('');

  const types = {
    avatar: {
      size: 100,
      component: <Avatar name={name} src={previewImg} {...props} />,
    },
    image: {
      size: 250,
      component: (
        <Image
          border="1px"
          borderColor="gray.200"
          objectFit="cover"
          src={previewImg}
          alt={name}
          {...props}
        />
      ),
    },
  };

  useEffect(() => {
    if (previewUrl) {
      getBearer().then((bearer) => {
        fetch(
          `${directusUrl}/assets/${previewUrl}?fit=cover&width=${types[type].size}&quality=90`,
          {
            method: 'GET',
            headers: { Authorization: bearer },
          }
        ).then(async (response) => {
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          setPreviewImg(objectUrl);
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, type]);

  return types[type].component;
}
