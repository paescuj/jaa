// Apply solid button style
function baseStyle(props) {
  return { ...props.theme.components.Button.variants.solid(props) };
}

export default {
  baseStyle,
};
