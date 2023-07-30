import { pluginFactories } from '@react-page/plugins-slate';
import { motion } from 'framer-motion';

export default pluginFactories.createComponentPlugin({
	addHoverButton: true,
	addToolbarButton: true,
	type: 'motionWrapper',
	object: 'block',
	icon: <span style={{ fontSize: '0.6em' }}>Motion Wrapper</span>,
	label: 'Motion Wrapper',
	Component: ({ children }) => (
		<motion.div
			variants={{
				hidden: { opacity: 0 },
				show: {
					opacity: 1,
					transition: {
						delay: 0.5,
						staggerChildren: 0.7,
						when: 'beforeChildren',
					},
				},
			}}
			initial="hidden"
			animate="show"
			exit={{ opacity: 0 }}
		>
			{children}
		</motion.div>
	),
});
