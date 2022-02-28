import { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { setTokenSourceMapRange } from 'typescript';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartItemsAmount {
  [key: number]: number;
}


interface CartContextData {
  cart: Product[];
  cartItemsAmount: CartItemsAmount;
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {

    try {

      const stock = await api.get<Stock>(`stock/${productId}`)
      .then((response) => response.data);

      const addCart = [...cart];
      const productExists = addCart.find(product => product.id === productId);
      // const stock = stocks.find((stock: Stock) => stock.id === productId);


      if(!stock || (stock && stock?.amount < 0)) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(!productExists) {

        const product: Product = await api.get(`products/${productId}`)
        .then((response) => response.data);

          product.amount = 1;

          if(stock.amount < product.amount) {
            toast.error('Quantidade solicitada fora de estoque');
            return;
          }

          const newCart = [...cart, product];

          setCart(newCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } else {

        if(productExists.amount <= 0) {
            toast.error('Quantidade solicitada fora de estoque');
            return;
          }

        const newAmount = productExists.amount + 1;
        updateProductAmount({ productId, amount: newAmount })
      }

    } catch (err) {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {



      const updateCart: Product[] = [...cart];
      const product = updateCart.find(product => product.id === productId);

      if(!product){
        throw new Error();
      }

      updateCart.map(product => {
        if(product.id === productId){
          const index = updateCart.indexOf(product);
          updateCart.splice(index, 1);
        }
      })

      setCart(updateCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));

    } catch (err) {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if(amount <= 0){
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const stock = await api.get(`stock/${productId}`)
      .then((response) => response.data);

      const updateCart: Product[] = [...cart];
      const product = updateCart.find((product: Product) => product.id === productId)
    //   const stock = stocks.find((stock: Stock) => stock.id === productId);

      if(!stock || stock.amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if(product){

        if(stock.amount < amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        product.amount = amount;

        setCart(updateCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart));
      }

    } catch (err) {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  const cartItemsAmount = cart.reduce((sumAmount, product: Product) => {

    sumAmount[product.id] = product.amount;

    return sumAmount;

  }, {} as CartItemsAmount);


  return (
    <CartContext.Provider
      value={{ cart, cartItemsAmount, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
