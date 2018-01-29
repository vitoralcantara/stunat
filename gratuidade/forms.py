# -*- coding: utf-8 -*-
from django import forms

from djtools.formfields import BrDataField, BrCepField
from djtools.formwidgets import BRCpfWidget, BrDataWidget, BrTelefoneWidget
from django.db.models import Max

from gratuidade.models import PessoaGratuidade, CarteirasAntigas
from comum.models import Endereco
from comum import choices
import datetime, pdb


##############
# GRATUIDADE #
##############

class PessoaGratuidadeForm(forms.ModelForm):
    class Meta:
        model = PessoaGratuidade
        jaAtivo = False

    def __init__(self, *args, **kwargs):
        super(PessoaGratuidadeForm, self).__init__(*args, **kwargs)
        if 'instance' in kwargs:
            endereco = Endereco.objects.get(pk=kwargs['instance'].endereco.pk)
            self.fields['logradouro'].initial = endereco.logradouro
            self.fields['numero'].initial = endereco.numero
            self.fields['complemento'].initial = endereco.complemento
            self.fields['bairro'].initial = endereco.bairro
            self.fields['municipio'].initial = endereco.municipio
            self.fields['cep'].initial = endereco.cep
            self.fields['situacao'] = forms.ChoiceField(label=u'Situação', widget=forms.Select(),
                                                        choices=choices.SITUACAO)
        else:
    # Este caso se aplica quando é criado um novo usuário, no qual é colocado a situação EM ANÁLISE no campo Situação.
            self.fields['situacao'] = forms.CharField(label=u'Situação')
            self.fields['situacao'].initial = u'EM ANÁLISE'
            self.fields['situacao'].widget.attrs['readonly'] = True

    @staticmethod
    def get_card_suffix(prefix,val):
        #pdb.set_trace()
        # type: (str, str) -> str
        if val.startswith(prefix):
            return val[len(prefix):] #retornando apenas o que vier depois do prefixo
        else:
            return "0"

    @property #esta função retorna o próximo número de carteira gerado. Ele é crescente, sendo no padrão XXXX+Y, onde X é o ano e Y é um número crescente
    def calculate_next_card_number(self):
        # Este comando busca o maior numero de carteira do ano atual
        cmd_res = PessoaGratuidade.objects.raw("select 1 as pessoa_ptr_id, max(numero_carteira) from gratuidade_pessoagratuidade where cast(numero_carteira as varchar(255)) like (trim(cast(date_part('year',now()) as varchar(255))) || '%%')")
        last_val = cmd_res[0].max
        this_year = datetime.datetime.now().year
        suffix_str = self.get_card_suffix(str(this_year),str(last_val))
        new_suffix = int(suffix_str) + 1
        new_val = int(str(this_year) + str(new_suffix))
        return new_val

    def save(self, commit=True, force_insert=False, force_update=False):

        if self.instance.pk and self.cleaned_data['situacao'] != u'EM ANÁLISE' \
                            and self.cleaned_data['situacao'] != 'INDEFERIDO'  \
                            and not self.instance.numero_carteira:
            self.instance.numero_carteira = self.calculate_next_card_number

        elif self.instance.pk \
            and (self.cleaned_data['situacao'] == u'EM ANÁLISE' or self.cleaned_data['situacao'] == 'INDEFERIDO') \
            and self.instance.numero_carteira:

            c_antiga = CarteirasAntigas()
            c_antiga.pessoa_id = self.instance
            c_antiga.numero_carteira = self.instance.numero_carteira

            c_antiga.data_desativada = datetime.datetime.now()
            c_antiga.save()
            self.instance.numero_carteira = None

        if self.instance.endereco_id is None:
            endereco = Endereco.objects.create()
        else:
            endereco = Endereco.objects.get(pk=self.instance.endereco.pk)
        endereco.logradouro = self.cleaned_data['logradouro']
        endereco.numero = self.cleaned_data['numero']
        endereco.complemento = self.cleaned_data['complemento']
        endereco.bairro = self.cleaned_data['bairro']
        endereco.municipio = self.cleaned_data['municipio']
        endereco.cep = self.cleaned_data['cep']
        endereco.save()
        self.instance.endereco = endereco
        return super(PessoaGratuidadeForm, self).save(commit)

    tipo = forms.ChoiceField(label=u'Tipo de Pessoa', widget=forms.Select(), choices=choices.TIPO_PESSOA)
    situacao = forms.ChoiceField(label=u'Situação', widget=forms.Select(), choices=choices.SITUACAO)

    telefone = forms.CharField(label=u'Telefone', widget=BrTelefoneWidget, required=False)
    cpf = forms.CharField(label=u'CPF', widget=BRCpfWidget, required=True)
    data_nascimento = BrDataField(label=u'Data nascimento', widget=BrDataWidget())
    nacionalidade = forms.ChoiceField(label=u'Nacionalidade', widget=forms.Select(), choices=choices.NACIONALIDADE,
                                      required=False)
    estado_civil = forms.ChoiceField(label=u'Estado Civil', widget=forms.Select(), choices=choices.ESTADO_CIVIL,
                                     required=False)

    validade = BrDataField(label=u'Validade', widget=BrDataWidget(),required=False)

    logradouro = forms.CharField(label=u'Logradouro')
    numero = forms.CharField(label=u'Número', required=False)
    complemento = forms.CharField(label=u'Complemento', required=False)
    bairro = forms.CharField(label=u'Bairro', required=False)
    municipio = forms.CharField(label=u'Município', required=False)
    cep = BrCepField(label=u'CEP', required=False)
