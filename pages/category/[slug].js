import App from '../index'

export async function getServerSideProps({ params }) {
  return {
    props: {
      initialRoute: {
        type: 'category',
        slug: params?.slug || '',
      },
    },
  }
}

export default App
