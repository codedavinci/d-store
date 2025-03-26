import {useState, useEffect} from 'react';
import {Link} from '@remix-run/react';
import type {FeaturedProductFragment} from 'storefrontapi.generated';
import {
  getAdjacentAndFirstAvailableVariants,
  Image,
  Money,
  useOptimisticVariant,
  getProductOptions,
} from '@shopify/hydrogen';

import type {
  Maybe,
  ProductOptionValueSwatch,
  MoneyV2,
} from '@shopify/hydrogen/storefront-api-types';

const TWO_SECONDS_TRANSITION = 2000;

interface ProductCardProps {
  product: FeaturedProductFragment;
}

type Pricing = Pick<MoneyV2, 'amount' | 'currencyCode'>;

interface PriceProps {
  actualPrice: Pricing;
  compareAtPrice?: Pricing | undefined | null;
}

function Price({actualPrice, compareAtPrice}: PriceProps) {
  if (!compareAtPrice) {
    return <Money data={actualPrice} />;
  }

  return (
    <div className="flex">
      <span className="line-through text-gray-500 mr-2">
        <Money data={compareAtPrice} />
      </span>
      <span className="text-red-500 font-bold">
        <Money data={actualPrice} />
      </span>
    </div>
  );
}

function Swatch({
  swatch,
  name,
  isSelected,
  onClick,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  return (
    <button
      aria-label={name}
      className={`w-6 h-6 rounded-full ${
        isSelected ? 'border-[#0A4874] outline-2' : ''
      }`}
      style={{
        backgroundColor: color || 'transparent',
        boxSizing: 'border-box',
      }}
      onClick={onClick}
    >
      {!!image && (
        <img src={image} alt={name} className="w-full h-full rounded-full" />
      )}
    </button>
  );
}

function addFakeSaleOnSomeProducts(variants: any) {
  return variants.map((variant: any) => {
    const shouldAddSale = Math.random() < 0.5;

    if (shouldAddSale) {
      return {
        ...variant,
        compareAtPrice: {
          amount: '300.0',
          currencyCode: 'CAD',
        },
      };
    }
    return variant;
  });
}

const ProductCard = ({product}: ProductCardProps) => {
  let variants = product.variants.edges.map((edge) => edge.node);
  variants = addFakeSaleOnSomeProducts(variants);

  const [selectedVariant, setSelectedVariant] = useState(variants[0]);
  const [hoverVariant, setHoverVariant] = useState<
    typeof selectedVariant | null
  >(null);
  const [isHovering, setIsHovering] = useState(false);

  const initialVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: initialVariant,
  });

  function handleVariantClick(colorName: string) {
    const matchingVariant = variants.find((variant) =>
      variant.selectedOptions.some(
        (opt) =>
          opt.name.toLowerCase() === 'color' &&
          opt.value.toLowerCase() === colorName.toLowerCase(),
      ),
    );

    if (matchingVariant) {
      setSelectedVariant(matchingVariant);
      setHoverVariant(null);
      setIsHovering(false);
    }
  }

  function handleMouseEnter() {
    setIsHovering(true);
  }

  function handleMouseLeave() {
    setIsHovering(false);
    setHoverVariant(null);
  }

  useEffect(() => {
    if (!isHovering || variants.length <= 1) return;

    const interval = setInterval(() => {
      setHoverVariant((prevVariant) => {
        const currentIndex = variants.findIndex(
          (v) => v.id === (prevVariant ? prevVariant.id : selectedVariant.id),
        );
        const nextVariant = variants[(currentIndex + 1) % variants.length];
        return nextVariant;
      });
    }, TWO_SECONDS_TRANSITION);

    return () => clearInterval(interval);
  }, [isHovering, selectedVariant, variants]);

  return (
    <div key={product.id} className="recommended-product relative">
      <div className="product-card border border-gray-300 p-4 hover:shadow-lg transition relative">
        {/* "On Sale!" Button on top of the image */}
        {selectedVariant.compareAtPrice && (
          <div className="absolute top-5 left-7 px-4 py-1 border-2 border-red-500 text-red-500 font-semibold rounded-full inline-block mt-2 z-10">
            On Sale!
          </div>
        )}

        {/* Show the image of the hovered variant while hovering, otherwise, show the selected variant */}
        <Link to={`/products/${product.handle}`}>
          <Image
            data={(hoverVariant || selectedVariant).image!}
            aspectRatio="1/1"
            sizes="(min-width: 45em) 20vw, 50vw"
            alt={product.title}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="rounded-md"
          />
        </Link>

        {/* Variant Swatches */}
        <div className="flex space-x-2 mt-3">
          {productOptions.map((option) => {
            if (option.name.toLowerCase() !== 'color') return null;

            return option.optionValues.map((value) => {
              const isSelected = selectedVariant.selectedOptions.some(
                (opt) =>
                  opt.name.toLowerCase() === 'color' &&
                  opt.value.toLowerCase() === value.name.toLowerCase(),
              );

              return (
                <Swatch
                  key={value.name}
                  swatch={value.swatch}
                  name={value.name}
                  isSelected={isSelected}
                  onClick={() => handleVariantClick(value.name)}
                />
              );
            });
          })}
        </div>
        {/* Product Title */}
        <div className=" mt-3 text-[14px] leading-[16px] font-roboto font-normal">
          {product.title}
        </div>

        {/* Product Vendor */}
        <h4 className=" text-[#0A4874] mt-2 text-lg font-semibold">
          {product.vendor}
        </h4>

        {/* Product Price */}
        <small>
          <Price
            actualPrice={selectedVariant.price}
            compareAtPrice={selectedVariant.compareAtPrice}
          />
        </small>
      </div>
    </div>
  );
};

export default ProductCard;
