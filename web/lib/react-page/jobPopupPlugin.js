import { pluginFactories } from '@react-page/plugins-slate';

import JobPopup from '@/components/common/JobPopup';

export default pluginFactories.createComponentPlugin({
	addHoverButton: true,
	addToolbarButton: false,
	type: 'jobPopup',
	object: 'inline',
	icon: <span style={{ fontSize: '0.6em' }}>Job Popup</span>,
	label: 'Job Popup',
	Component: ({ link = 'https://example.org/job/1', preview, children }) => {
		const props = {
			link,
		};
		if (preview?.[0]) {
			props.assetId = preview[0];
		} else {
			props.imgSrc = 'https://picsum.photos/300/200';
		}
		return <JobPopup {...props}>{children}</JobPopup>;
	},
});
